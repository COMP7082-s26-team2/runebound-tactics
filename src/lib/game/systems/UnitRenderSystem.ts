import { World } from "@/lib/engine/world/World";
import { GameComponent } from "@/lib/engine/core/GameComponent";
import { TweenManager } from "@/lib/engine/core/TweenManager";

export class UnitRenderSystem implements GameComponent {
    readonly zIndex = 2; // above grid (0) and movement highlights (1)

    constructor(
        private _world: World,
        private _gridCols: number,
        private _gridRows: number,
        private _cellSize: number,
        private _tweens?: TweenManager,
    ) {}

    draw(ctx: CanvasRenderingContext2D) {
        for (const [, entityId] of this._world.occupancyMap.entries()) {
            const coord = this._world.gridPositions.get(entityId);
            if (!coord) continue;

            const fallback = {
                x: coord.q * this._cellSize,
                y: coord.r * this._cellSize,
            };
            const { x, y } = this._tweens
                ? this._tweens.getPosition(entityId, fallback)
                : fallback;

            const appearance = this._world.unitAppearance.get(entityId);
            ctx.fillStyle = appearance?.color ?? "gray";
            ctx.fillRect(x, y, this._cellSize, this._cellSize);
        }
    }
}
