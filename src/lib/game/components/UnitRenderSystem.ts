import { World, GameComponent } from "@/lib/engine/";

export class UnitRenderSystem implements GameComponent {
    constructor(
        private world: World,
        private gridCols: number,
        private gridRows: number,
        private cellSize: number,
    ) {}

    draw(ctx: CanvasRenderingContext2D) {
        for (const [key, entityId] of this.world.occupancyMap.entries()) {
            const coord = this.world.gridPositions.get(entityId);
            if (!coord) continue; // skip units without a position
            const x = coord.q * this.cellSize + this.cellSize / 10;
            const y = coord.r * this.cellSize + this.cellSize / 10;

            const appearance = this.world.unitAppearance.get(entityId);
            ctx.fillStyle = appearance?.color ?? "gray";
            ctx.fillRect(
                x,
                y,
                this.cellSize - (this.cellSize / 10) * 2,
                this.cellSize - (this.cellSize / 10) * 2,
            );
        }
    }
}
