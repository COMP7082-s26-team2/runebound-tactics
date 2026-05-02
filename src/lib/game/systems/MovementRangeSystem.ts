import { GameComponent } from "@/lib/engine/core/GameComponent";
import { World } from "@/lib/engine/world/World";
import { GameState } from "@/lib/game/state/GameState";

export class MovementRangeSystem implements GameComponent {
    readonly zIndex = 1; // above grid tiles, below unit sprites

    constructor(
        private _world: World,
        private _cellSize: number,
        private _state: GameState,
    ) {}

    draw(ctx: CanvasRenderingContext2D): void {
        if (this._state.phase === "idle") return;

        // Reachable movement tiles — blue
        ctx.fillStyle = "rgba(100, 149, 237, 0.4)";
        for (const key of this._state.reachableTiles) {
            const [q, r] = key.split(",").map(Number);
            ctx.fillRect(
                q * this._cellSize,
                r * this._cellSize,
                this._cellSize,
                this._cellSize,
            );
        }

        // Attackable enemy tiles — red (only before the unit has attacked)
        if (this._state.phase === "selected") {
            ctx.fillStyle = "rgba(220, 50, 50, 0.4)";
            for (const entityId of this._state.attackableEntities) {
                const coord = this._world.gridPositions.get(entityId);
                if (!coord) continue;
                ctx.fillRect(
                    coord.q * this._cellSize,
                    coord.r * this._cellSize,
                    this._cellSize,
                    this._cellSize,
                );
            }
        }

        // Yellow outline on the selected unit
        if (this._state.selectedEntity !== null) {
            const coord = this._world.gridPositions.get(
                this._state.selectedEntity,
            );
            if (coord) {
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
    }
}
