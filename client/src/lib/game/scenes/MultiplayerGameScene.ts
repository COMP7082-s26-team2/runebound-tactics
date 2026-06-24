import {
    Scene,
    World,
    SquareGrid,
    TweenManager,
    AnimationController,
    AssetHandler,
    AnimationSequencer,
} from "@/lib/engine";
import EventBus from "@/lib/engine/EventBus";
import {
    GridRenderSystem,
    UnitRenderSystem,
    InputSystem,
} from "@/lib/game/systems";
import { MultiplayerSelectionSystem } from "@/lib/game/systems/MultiplayerSelectionSystem";
import { MovementRangeRenderSystem } from "@/lib/game/systems/MovementRangeRenderSystem";
import { EnemyTargetOutlineSystem } from "@/lib/game/systems/EnemyTargetOutlineSystem";
import {
    unitTypeToStats,
    unitTypeToAppearance,
} from "@/lib/game/assets/multiplayerUnitMap";
import {
    ANIMATION_FRAME_DURATIONS,
    DEFAULT_FRAME_DURATION,
} from "@/lib/game/assets";
import {
    diffSnapshots,
    buildMoveSequence,
    buildAttackSequence,
    buildDeathSequence,
    type LiteUnit,
    type SequenceDeps,
} from "@/lib/game/animation/sequences";
import {
    CELL_SIZE,
    GRID_COLS,
    GRID_ROWS,
    unitIsExhausted,
    type GameState as ServerGameState,
} from "@runebound-tactics/shared";
import type { Room } from "@colyseus/sdk";
import type { TerrainLayer } from "@/lib/game/tilemap";

/**
 * Multiplayer game scene.
 *
 * Reconciles `state.units` snapshots from the server into the local
 * `World` by classifying snapshot deltas as high-level events (move,
 * attack, death, spawn) and dispatching multi-step animation sequences
 * through the {@link AnimationSequencer}. See
 * [[tween_sequencing_design_v1.0]] for the orchestration architecture.
 *
 * Logical bookkeeping (HP delta detection, `_lastSeenHp`, `_prevSnapshot`,
 * `_eventBus` emissions) stays in this reconcile loop. Visual lifecycle
 * (walk paths, lunges, death animations, world removal) happens inside
 * the dispatched sequences.
 *
 * Emits `combat:damage` and `unit:despawn` events on the scene's
 * EventBus. A future CombatFeedbackSystem will subscribe to render
 * floating damage numbers, death sparks, etc.
 */
export class MultiplayerGameScene extends Scene {
    private _world: World;
    private _selection: MultiplayerSelectionSystem;
    private _tweens: TweenManager;
    private _animationController: AnimationController;
    private _sequencer: AnimationSequencer;
    private _seqDeps: SequenceDeps;
    private _eventBus = new EventBus();
    private _lastSeenHp = new Map<string, number>();
    private _prevSnapshot = new Map<string, LiteUnit>();
    private _hasAuthoritativeSnapshot = false;
    public input: InputSystem;
    public onSelectionChange: ((unitId: string | null) => void) | null = null;
    private _terrainLayer: TerrainLayer;
    private _tilemapSheet: HTMLImageElement;

    constructor(
        private _canvas: HTMLCanvasElement,
        private _room: Room<ServerGameState>,
        private _assetHandler: AssetHandler,
        terrainLayer: TerrainLayer,
        tilemapSheet: HTMLImageElement,
    ) {
        super();
        this._terrainLayer = terrainLayer;
        this._tilemapSheet = tilemapSheet;
        const grid = new SquareGrid(CELL_SIZE);
        this._world = new World(grid);
        this.input = new InputSystem(this._canvas);
        this._tweens = new TweenManager();
        this._animationController = new AnimationController(
            (state) => ANIMATION_FRAME_DURATIONS[state] ?? DEFAULT_FRAME_DURATION,
        );
        this._sequencer = new AnimationSequencer();
        this._seqDeps = {
            world: this._world,
            tween: this._tweens,
            anim: this._animationController,
            assets: this._assetHandler,
            sequencer: this._sequencer,
            terrainLayer: this._terrainLayer,
        };
        this._selection = new MultiplayerSelectionSystem(
            this._world,
            CELL_SIZE,
            this.input,
            this._room,
            this._terrainLayer,
        );
    }

    get eventBus(): EventBus {
        return this._eventBus;
    }

    init(): void {
        // Order matters for update():
        //   - Consumers of input (`MultiplayerSelectionSystem`) must run BEFORE
        //     `InputSystem.update()` clears `_mouseJustPressed` for the frame.
        //   - `_sequencer` advances multi-step animations; its steps may
        //     internally call `_tweens.startPath(...)` (WalkStep, LungeStep),
        //     so the sequencer ticks BEFORE `_tweens` advances positions for
        //     this frame.
        //   - Animation state (idle/walk/attack/damage/death) is now owned
        //     by sequencer steps (WalkStep, SetAnimationStateStep, etc).
        //     UnitAnimationSystem is intentionally NOT registered — it would
        //     override sequence-set states like "attack" with "walk" every
        //     frame while a tween is active. See [[tween_sequencing_design_v1.0]].
        //   - `_animationController` runs after the sequencer so frame
        //     indices advance with the freshly-set animation state.
        //   - Renderers consume freshly-updated tween position + anim frame
        //     within the same tick.
        //   - `this.input` is added LAST so its clear-just-pressed runs after
        //     `_selection` reads input.
        this._selection.onSelectionChange = (unitId) =>
            this.onSelectionChange?.(unitId);
        this.components.add(this._selection);
        this.components.add(this._sequencer);
        this.components.add(this._tweens);
        this.components.add(this._animationController);
        this.components.add(
            new GridRenderSystem(this._terrainLayer, this._tilemapSheet, CELL_SIZE),
        );
        this.components.add(
            new MovementRangeRenderSystem(
                this._world,
                CELL_SIZE,
                this._selection,
            ),
        );
        this.components.add(
            new UnitRenderSystem(
                this._world,
                GRID_COLS,
                GRID_ROWS,
                CELL_SIZE,
                this._tweens,
                this._assetHandler,
                this._animationController,
            ),
        );
        this.components.add(
            new EnemyTargetOutlineSystem(
                this._world,
                CELL_SIZE,
                this._selection,
            ),
        );
        this.components.add(this.input);
    }

    destroy(): void {
        // InputSystem and any future stateful components receive their
        // destroy hooks before this scene and its world are discarded.
        this.components.clear();
        this._prevSnapshot.clear();
        this._lastSeenHp.clear();
        this._hasAuthoritativeSnapshot = false;
    }

    /**
     * Seeds a newly created scene directly from the server snapshot.
     * Restoration must not replay movement, combat, or death animations that
     * occurred while this client was disconnected.
     */
    private _restoreAuthoritativeSnapshot(
        incoming: Map<string, LiteUnit>,
        mySessionId: string,
    ): void {
        // Remove any local entity that is absent from the restored snapshot.
        // A fresh reconnect scene normally has none, but this keeps repeated
        // reconciliation idempotent if scene reuse is introduced later.
        for (const serverId of this._world.getAllServerIds()) {
            if (incoming.has(serverId)) {
                continue;
            }

            const entityId = this._world.getEntityByServerId(serverId);
            if (entityId !== undefined) {
                this._sequencer.cancel(entityId);
                this._animationController.deregister(entityId);
                this._world.removeUnit(entityId);
            }
        }

        for (const [unitId, unit] of incoming) {
            const exhausted =
                unit.ownerId === mySessionId && unitIsExhausted(unit);
            const existing = this._world.getEntityByServerId(unitId);

            if (existing === undefined) {
                const appearance = {
                    ...unitTypeToAppearance(unit.unitType, unit.ownerId),
                    exhausted,
                };
                const entityId = this._world.spawnUnit(
                    { q: unit.x, r: unit.y },
                    unitTypeToStats(unit.unitType),
                    appearance,
                    unit.ownerId,
                    unitId,
                );
                const sheet = this._assetHandler.getSpriteSheet(
                    appearance.assetKey,
                );
                this._animationController.register(
                    entityId,
                    "idle",
                    sheet?.frameCount ?? 1,
                );
                continue;
            }

            const current = this._world.gridPositions.get(existing);
            if (!current || current.q !== unit.x || current.r !== unit.y) {
                this._world.moveUnit(existing, { q: unit.x, r: unit.y });
            }

            const appearance = this._world.unitAppearance.get(existing);
            if (appearance) {
                appearance.exhausted = exhausted;
                appearance.alpha = 1;
                appearance.scale = 1;
            }
            this._animationController.setState(existing, "idle");
        }

        this._prevSnapshot = new Map(incoming);
        this._lastSeenHp = new Map(
            [...incoming].map(([unitId, unit]) => [unitId, unit.hp]),
        );
        this._hasAuthoritativeSnapshot = true;
    }

    /**
     * Snapshot-diff reconciler.
     *
     * Pipeline (per frame Colyseus state patch):
     *   1. Collect incoming snapshot into a Map<unitId, LiteUnit>.
     *   2. HP delta detection (logical) — emit `combat:damage` for any unit
     *      whose hp dropped vs `_lastSeenHp`. Update `_lastSeenHp`.
     *   3. Update `appearance.exhausted` on existing units.
     *   4. Spawn new units inline (no spawn animation in v1).
     *   5. Compute high-level events via `diffSnapshots(prev, incoming, world)`.
     *   6. Apply logical world position updates for all moves + walking
     *      attackers (so subsequent BFS sees the correct occupancy map).
     *   7. Update `_prevSnapshot = incoming`.
     *   8. Logical death bookkeeping (emit `unit:despawn`, clear `_lastSeenHp`).
     *      The visual entity stays in the world; `DespawnStep` removes it
     *      at the end of the death sequence.
     *   9. Dispatch animation sequences via `_sequencer.play(...)`.
     *
     * `@colyseus/react`'s `useRoomState` hook returns a plain-object
     * snapshot, whereas the live `room.state` exposes MapSchema. Iterate
     * defensively so the scene works regardless of which shape arrives.
     */
    reconcile(serverState: ServerGameState | undefined): void {
        if (!serverState) return;
        const units = serverState.units;
        if (!units) return;

        // ── 1. Collect snapshot ──────────────────────────────────
        const incoming = new Map<string, LiteUnit>();
        const maybeMap = units as unknown as {
            entries?: () => IterableIterator<[string, LiteUnit]>;
        };
        if (typeof maybeMap.entries === "function") {
            for (const [k, v] of maybeMap.entries()) incoming.set(k, v);
        } else {
            for (const [k, v] of Object.entries(
                units as unknown as Record<string, LiteUnit>,
            )) {
                incoming.set(k, v);
            }
        }

        const mySessionId = this._room.sessionId;

        // The first patch received by a new scene is a complete source of
        // truth, not a gameplay delta from the empty local world.
        if (!this._hasAuthoritativeSnapshot) {
            this._restoreAuthoritativeSnapshot(incoming, mySessionId);
            return;
        }

        // ── 2. HP delta detection + _lastSeenHp update ──────────
        for (const [unitId, unit] of incoming) {
            const prevHp = this._lastSeenHp.get(unitId);
            if (prevHp !== undefined && unit.hp < prevHp) {
                this._eventBus.emit("combat:damage", {
                    unitId,
                    amount: prevHp - unit.hp,
                    newHp: unit.hp,
                });
            }
            this._lastSeenHp.set(unitId, unit.hp);
        }

        // ── 3 + 4. Update exhausted + spawn new units ───────────
        for (const [unitId, unit] of incoming) {
            const isMine = unit.ownerId === mySessionId;
            const exhausted = isMine && unitIsExhausted(unit);

            const existing = this._world.getEntityByServerId(unitId);
            if (existing === undefined) {
                const appearance = {
                    ...unitTypeToAppearance(unit.unitType, unit.ownerId),
                    exhausted,
                };
                const entityId = this._world.spawnUnit(
                    { q: unit.x, r: unit.y },
                    unitTypeToStats(unit.unitType),
                    appearance,
                    unit.ownerId,
                    unitId,
                    unit.unitType,
                );
                const sheet = this._assetHandler.getSpriteSheet(
                    appearance.assetKey,
                );
                this._animationController.register(
                    entityId,
                    "idle",
                    sheet?.frameCount ?? 1,
                );
                continue;
            }

            const appearance = this._world.unitAppearance.get(existing);
            if (appearance) appearance.exhausted = exhausted;
        }

        // ── 5. Classify deltas as events ────────────────────────
        const events = diffSnapshots(this._prevSnapshot, incoming, this._world);

        // ── 6. Apply logical position updates ───────────────────
        // Movers' new positions land in world.occupancyMap so subsequent
        // BFS calls (inside sequence builders) see the correct state.
        for (const move of events.moves) {
            const current = this._world.gridPositions.get(move.entityId);
            if (!current || current.q !== move.to.q || current.r !== move.to.r) {
                this._world.moveUnit(move.entityId, move.to);
            }
        }
        for (const attack of events.attacks) {
            if (attack.attackerPathFrom === null) continue;
            const current = this._world.gridPositions.get(attack.attackerId);
            if (
                !current ||
                current.q !== attack.attackerFinalPos.q ||
                current.r !== attack.attackerFinalPos.r
            ) {
                this._world.moveUnit(
                    attack.attackerId,
                    attack.attackerFinalPos,
                );
            }
        }

        // ── 7. Roll forward _prevSnapshot ───────────────────────
        this._prevSnapshot = incoming;

        // ── 8. Logical death bookkeeping ────────────────────────
        // Visual removal happens at the end of the death sequence via
        // DespawnStep. Here we only emit the event and clear HP tracking
        // so the next snapshot's diff classifier doesn't re-process the
        // unit.
        for (const death of events.orphanDeaths) {
            const serverId = this._world.getServerIdByEntity(death.entityId);
            if (serverId) {
                this._lastSeenHp.delete(serverId);
                this._eventBus.emit("unit:despawn", { unitId: serverId });
            }
        }
        for (const attack of events.attacks) {
            if (!attack.targetWillDie) continue;
            const serverId = this._world.getServerIdByEntity(attack.targetId);
            if (serverId) {
                this._lastSeenHp.delete(serverId);
                this._eventBus.emit("unit:despawn", { unitId: serverId });
            }
        }

        // ── 9. Dispatch animation sequences ─────────────────────
        for (const move of events.moves) {
            this._sequencer.play(
                move.entityId,
                buildMoveSequence(move, this._seqDeps),
            );
        }
        for (const attack of events.attacks) {
            this._sequencer.play(
                attack.attackerId,
                buildAttackSequence(attack, this._seqDeps),
            );
        }
        for (const death of events.orphanDeaths) {
            this._sequencer.play(
                death.entityId,
                buildDeathSequence(death, this._seqDeps),
            );
        }
    }
}
