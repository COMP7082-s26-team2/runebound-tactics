import { GameComponent, World } from "@/lib/engine";
import { MultiplayerSelectionSystem } from "./MultiplayerSelectionSystem";

/**
 * Multiplayer-side movement range renderer.
 *
 * Reads highlights from a `MultiplayerSelectionSystem` (which holds the
 * shared `selectionMachine` context). Stays separate from the existing
 * `MovementRangeSystem` (which reads from `ClientGameState`) so the
 * singleplayer scratchpad keeps working unchanged.
 */
export class MovementRangeRenderSystem implements GameComponent {
    readonly zIndex = 1; // above grid, below units

    constructor(
        private _world: World,
        private _cellSize: number,
        private _selection: MultiplayerSelectionSystem,
    ) {}

    draw(ctx: CanvasRenderingContext2D): void {
        if (this._selection.selectionState === "idle") return;

        // Blue fill for reachable tiles
        ctx.fillStyle = "rgba(100, 149, 237, 0.4)";
        for (const key of this._selection.reachableTiles) {
            const [q, r] = key.split(",").map(Number);
            ctx.fillRect(
                q! * this._cellSize,
                r! * this._cellSize,
                this._cellSize,
                this._cellSize,
            );
        }

        // Yellow outline on the selected unit
        const serverId = this._selection.selectedUnitId;
        if (!serverId) return;
        const entityId = this._world.getEntityByServerId(serverId);
        if (entityId === undefined) return;
        const coord = this._world.gridPositions.get(entityId);
        if (!coord) return;

        ctx.save();
        ctx.strokeStyle = "rgba(255, 230, 50, 0.95)";
        ctx.lineWidth = 3;
        ctx.strokeRect(
            coord.q * this._cellSize + 1.5,
            coord.r * this._cellSize + 1.5,
            this._cellSize - 3,
            this._cellSize - 3,
        );
        ctx.restore();
    }
}
