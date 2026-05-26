import { GameComponent, World, cellKey } from "@/lib/engine";
import { InputSystem } from "@/lib/game/systems/InputSystem";
import {
    computeReachableTiles,
    createSelectionMachine,
    squareGridNeighbors,
    type SelectionMachine,
    type GridCoord,
    type GameState,
} from "@runebound-tactics/shared";
import type { Room } from "@colyseus/sdk";

/**
 * Multiplayer click-to-select / click-to-move system.
 *
 * Owns a shared `selectionMachine` (idle ↔ selected). Translates canvas
 * clicks into machine events and Colyseus `move_unit` messages.
 *
 * Turn-gated via `state.currentTurnId === room.sessionId`. Clicks on
 * opponent units or while it isn't your turn are silently dropped.
 *
 * Used by MultiplayerGameScene. Not interchangeable with the singleplayer
 * `SelectionSystem` — they consume different selection-state holders.
 */
export class MultiplayerSelectionSystem implements GameComponent {
    private _selection: SelectionMachine = createSelectionMachine();

    constructor(
        private _world: World,
        private _cellSize: number,
        private _input: InputSystem,
        private _room: Room<GameState>,
    ) {}

    get selectionState() {
        return this._selection.state;
    }

    get reachableTiles(): ReadonlySet<string> {
        return this._selection.context.reachableTiles;
    }

    get selectedUnitId(): string | null {
        return this._selection.context.selectedUnitId;
    }

    update(_dt: number): void {
        if (!this._isMyTurn()) return;
        if (!this._input.isMouseButtonJustPressed(0)) return;

        const coord: GridCoord = {
            q: Math.floor(this._input.mouseX / this._cellSize),
            r: Math.floor(this._input.mouseY / this._cellSize),
        };
        const key = cellKey(coord);

        if (this._selection.state === "idle") {
            const occupant = this._world.occupancyMap.get(key);
            if (occupant === undefined) return;

            const serverId = this._world.getServerIdByEntity(occupant);
            if (!serverId || !this._isFriendly(serverId)) return;

            const stats = this._world.unitStats.get(occupant);
            const start = this._world.gridPositions.get(occupant);
            if (!stats || !start) return;

            const reachable = computeReachableTiles({
                getNeighbors: squareGridNeighbors,
                isOccupied: (k) => this._world.occupancyMap.has(k),
                movement: stats.movement,
                start,
            });

            this._selection.send("SELECT_FRIENDLY", {
                unitId: serverId,
                reachable,
            });
            return;
        }

        // state === "selected"
        if (this._selection.context.reachableTiles.has(key)) {
            const serverId = this._selection.context.selectedUnitId;
            if (!serverId) {
                this._selection.send("DESELECT");
                return;
            }
            this._room.send("move_unit", {
                unitId: serverId,
                x: coord.q,
                y: coord.r,
            });
            this._selection.send("MOVE_REQUESTED", {
                unitId: serverId,
                to: coord,
            });
            return;
        }

        this._selection.send("DESELECT");
    }

    private _isMyTurn(): boolean {
        const state = this._room.state;
        return (
            state?.phase === "active" &&
            state.currentTurnId === this._room.sessionId
        );
    }

    private _isFriendly(serverId: string): boolean {
        const unit = this._room.state?.units?.get(serverId);
        return unit?.ownerId === this._room.sessionId;
    }
}
