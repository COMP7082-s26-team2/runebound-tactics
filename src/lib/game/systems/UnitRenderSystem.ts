import { World } from "@/lib/engine/world/World";
import { GameComponent } from "@/lib/engine/core/GameComponent";

export class UnitRenderSystem implements GameComponent {
    constructor(
        private _world: World,
        private _gridCols: number,
        private _gridRows: number,
        private _cellSize: number,
    ) {}

    draw(ctx: CanvasRenderingContext2D) {
        for (const [, entityId] of this._world.occupancyMap.entries()) {
            const coord = this._world.gridPositions.get(entityId);
            if (!coord) continue; // skip units without a position
            const x = coord.q * this._cellSize;
            const y = coord.r * this._cellSize;

            const appearance = this._world.unitAppearance.get(entityId);
            ctx.fillStyle = appearance?.color ?? "gray";
            ctx.fillRect(x, y, this._cellSize, this._cellSize);
        }
    }
}
