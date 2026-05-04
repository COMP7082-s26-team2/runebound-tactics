import { World, GameComponent, TweenManager } from "@/lib/engine";

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

            const fallback = this._world.grid.gridToWorld(coord);
            const { x, y } = this._tweens
                ? this._tweens.getPosition(entityId, fallback)
                : fallback;

            const appearance = this._world.unitAppearance.get(entityId);

            // todo: fetch sprites from here when implemented, for now just colored rectangles

            ctx.fillStyle = appearance?.color ?? "gray";
            ctx.fillRect(x, y, this._cellSize, this._cellSize);
        }
    }
}
