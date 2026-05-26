import { Scene, World, SquareGrid } from "@/lib/engine";
import {
    GridRenderSystem,
    UnitRenderSystem,
    InputSystem,
} from "@/lib/game/systems";
import { MultiplayerSelectionSystem } from "@/lib/game/systems/MultiplayerSelectionSystem";
import { MovementRangeRenderSystem } from "@/lib/game/systems/MovementRangeRenderSystem";
import {
    unitTypeToStats,
    unitTypeToAppearance,
} from "@/lib/game/assets/multiplayerUnitMap";
import {
    CELL_SIZE,
    GRID_COLS,
    GRID_ROWS,
    unitIsExhausted,
    type GameState as ServerGameState,
} from "@runebound-tactics/shared";
import type { Room } from "@colyseus/sdk";

/**
 * Multiplayer game scene.
 *
 * Wires the shared `selectionMachine` (via MultiplayerSelectionSystem) to
 * canvas input and to the Colyseus room. Reconciles `state.units` snapshots
 * from the server into the local `World` on each state change.
 *
 * Movement scope only — no combat rendering, no HP bars, no end-turn UI
 * inside the scene (the wrapping React `GameHUD` owns those).
 */
export class MultiplayerGameScene extends Scene {
    private _world: World;
    private _selection: MultiplayerSelectionSystem;
    public input: InputSystem;

    constructor(
        private _canvas: HTMLCanvasElement,
        private _room: Room<ServerGameState>,
    ) {
        super();
        const grid = new SquareGrid(CELL_SIZE);
        this._world = new World(grid);
        this.input = new InputSystem(this._canvas);
        this._selection = new MultiplayerSelectionSystem(
            this._world,
            CELL_SIZE,
            this.input,
            this._room,
        );
    }

    init(): void {
        // Order matters for update():
        //   - Consumers of input (`MultiplayerSelectionSystem`) must run BEFORE
        //     `InputSystem.update()` clears `_mouseJustPressed` for the frame.
        //   - Therefore `this.input` is added LAST so it ticks last.
        // Same convention as the singleplayer `GridMovementScene`.
        this.components.add(this._selection);
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
     * Spawn-or-update for each unit in `state.units`. No removal in
     * movement scope (combat / death is future work).
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

        for (const [unitId, unit] of entries) {
            const isMine = unit.ownerId === mySessionId;
            const exhausted = isMine && unitIsExhausted(unit);

            const existing = this._world.getEntityByServerId(unitId);
            if (existing === undefined) {
                this._world.spawnUnit(
                    { q: unit.x, r: unit.y },
                    unitTypeToStats(unit.unitType),
                    {
                        ...unitTypeToAppearance(unit.unitType, unit.ownerId),
                        exhausted,
                    },
                    unit.ownerId,
                    unitId,
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
                this._world.moveUnit(existing, { q: unit.x, r: unit.y });
            }
        }
    }
}
