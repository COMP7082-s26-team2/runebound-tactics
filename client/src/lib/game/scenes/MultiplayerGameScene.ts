import {
    Scene,
    World,
    SquareGrid,
    TweenManager,
    AnimationController,
    AssetHandler,
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
    UnitAnimationSystem,
} from "@/lib/game/assets";
import {
    CELL_SIZE,
    GRID_COLS,
    GRID_ROWS,
    unitIsExhausted,
    type GameState as ServerGameState,
} from "@runebound-tactics/shared";
import type { Room } from "@colyseus/sdk";

/**
 * Seconds spent tweening a unit across one cell on a position update.
 * Straight-line interpolation from current visual position to destination
 * cell center; multi-cell server moves still tween straight to the endpoint
 * (server doesn't broadcast the path).
 */
const MOVE_STEP_DURATION = 0.25;

/**
 * Multiplayer game scene.
 *
 * Wires the shared `selectionMachine` (via MultiplayerSelectionSystem) to
 * canvas input and to the Colyseus room. Reconciles `state.units` snapshots
 * from the server into the local `World` on each state change.
 *
 * Emits `combat:damage` and `unit:despawn` events on the scene's EventBus
 * when reconcile detects HP decrease or unit removal. A future
 * CombatFeedbackSystem will subscribe to render floating damage numbers,
 * death sparks, etc. For now consumers can `scene.eventBus.on(...)`
 * directly.
 */
export class MultiplayerGameScene extends Scene {
    private _world: World;
    private _selection: MultiplayerSelectionSystem;
    private _tweens: TweenManager;
    private _animationController: AnimationController;
    private _unitAnimationSystem: UnitAnimationSystem;
    private _eventBus = new EventBus();
    private _lastSeenHp = new Map<string, number>();
    public input: InputSystem;

    constructor(
        private _canvas: HTMLCanvasElement,
        private _room: Room<ServerGameState>,
        private _assetHandler: AssetHandler,
    ) {
        super();
        const grid = new SquareGrid(CELL_SIZE);
        this._world = new World(grid);
        this.input = new InputSystem(this._canvas);
        this._tweens = new TweenManager();
        this._animationController = new AnimationController(
            (state) => ANIMATION_FRAME_DURATIONS[state] ?? DEFAULT_FRAME_DURATION,
        );
        this._unitAnimationSystem = new UnitAnimationSystem(
            this._world,
            this._tweens,
            this._animationController,
        );
        this._selection = new MultiplayerSelectionSystem(
            this._world,
            CELL_SIZE,
            this.input,
            this._room,
        );
    }

    get eventBus(): EventBus {
        return this._eventBus;
    }

    init(): void {
        // Order matters for update():
        //   - Consumers of input (`MultiplayerSelectionSystem`) must run BEFORE
        //     `InputSystem.update()` clears `_mouseJustPressed` for the frame.
        //   - `_tweens` advances positions; `_unitAnimationSystem` then reads
        //     `tweens.isMoving(...)` and sets walk/idle state on the
        //     `_animationController`, which finally advances frame indices.
        //   - Renderers consume freshly-updated tween position + anim frame
        //     within the same tick.
        //   - `this.input` is added LAST so its clear-just-pressed runs after
        //     `_selection` reads input.
        this.components.add(this._selection);
        this.components.add(this._tweens);
        this.components.add(this._unitAnimationSystem);
        this.components.add(this._animationController);
        this.components.add(
            new GridRenderSystem(
                this._world,
                GRID_COLS,
                GRID_ROWS,
                CELL_SIZE,
            ),
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
        // ComponentManager.remove handles per-component destroy.
        // Scene base class doesn't expose a bulk-remove, but the engine's
        // lifecycle disposes the scene wholesale when switched away from.
    }

    /**
     * Inline reconciler.
     *
     * Spawn-or-update for each unit in `state.units`. Detects:
     *   - HP decrease → emit `combat:damage` event
     *   - Unit despawn (in snapshot but not in incoming entries) → remove
     *     from World and emit `unit:despawn` event
     *
     * `@colyseus/react`'s `useRoomState` hook returns a plain-object
     * snapshot, whereas the live `room.state` exposes MapSchema. Iterate
     * defensively so the scene works regardless of which shape arrives.
     */
    reconcile(serverState: ServerGameState | undefined): void {
        if (!serverState) return;
        const units = serverState.units;
        if (!units) return;

        type LiteUnit = {
            unitId: string;
            ownerId: string;
            unitType: string;
            x: number;
            y: number;
            hp: number;
            hasMoved: boolean;
        };

        const entries: Array<[string, LiteUnit]> = [];
        const maybeMap = units as unknown as {
            entries?: () => IterableIterator<[string, LiteUnit]>;
        };
        if (typeof maybeMap.entries === "function") {
            for (const e of maybeMap.entries()) entries.push(e);
        } else {
            for (const [k, v] of Object.entries(
                units as unknown as Record<string, LiteUnit>,
            )) {
                entries.push([k, v]);
            }
        }

        const mySessionId = this._room.sessionId;
        const seenUnitIds = new Set<string>();

        for (const [unitId, unit] of entries) {
            seenUnitIds.add(unitId);
            const isMine = unit.ownerId === mySessionId;
            const exhausted = isMine && unitIsExhausted(unit);

            // HP delta detection
            const prevHp = this._lastSeenHp.get(unitId);
            if (prevHp !== undefined && unit.hp < prevHp) {
                this._eventBus.emit("combat:damage", {
                    unitId,
                    amount: prevHp - unit.hp,
                    newHp: unit.hp,
                });
            }
            this._lastSeenHp.set(unitId, unit.hp);

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

                // Register with the animation controller. Frame count comes
                // from the sprite sheet definition; fallback to 1 when the
                // asset isn't in the manifest (UnitRenderSystem will draw a
                // color square in that case — no frames to cycle).
                const sheet = this._assetHandler.getSpriteSheet(appearance.assetKey);
                this._animationController.register(
                    entityId,
                    "idle",
                    sheet?.frameCount ?? 1,
                );
                continue;
            }

            const appearance = this._world.unitAppearance.get(existing);
            if (appearance) appearance.exhausted = exhausted;

            const current = this._world.gridPositions.get(existing);
            if (
                !current ||
                current.q !== unit.x ||
                current.r !== unit.y
            ) {
                // Smooth visual move from the current rendered position
                // (handles mid-tween reconciles by reading the live tween
                // position) to the new cell center. Logical position is
                // updated immediately so subsequent reconciles see the new
                // occupancy map.
                const targetCoord = { q: unit.x, r: unit.y };
                const fromWorld = this._world.grid.gridToWorld(current ?? targetCoord);
                const toWorld = this._world.grid.gridToWorld(targetCoord);
                const visualStart = this._tweens.getPosition(existing, fromWorld);
                this._tweens.startPath(
                    existing,
                    [visualStart, toWorld],
                    MOVE_STEP_DURATION,
                );
                this._world.moveUnit(existing, targetCoord);
            }
        }

        // Despawn: any local entity bound to a serverId no longer in
        // serverState.units must be removed.
        for (const serverId of this._world.getAllServerIds()) {
            if (seenUnitIds.has(serverId)) continue;
            const entityId = this._world.getEntityByServerId(serverId);
            if (entityId !== undefined) {
                this._animationController.deregister(entityId);
                this._world.removeUnit(entityId);
            }
            this._lastSeenHp.delete(serverId);
            this._eventBus.emit("unit:despawn", { unitId: serverId });
        }
    }
}
