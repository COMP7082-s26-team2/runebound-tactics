import { World, GameComponent } from "@/lib/engine/";

export class GridRenderSystem implements GameComponent {
    constructor(
        private world: World,
        private gridCols: number,
        private gridRows: number,
        private cellSize: number,
    ) {}

    draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillStyle = "#333";
        for (let q = 0; q < this.gridCols; q++) {
            for (let r = 0; r < this.gridRows; r++) {
                const x = q * this.cellSize;
                const y = r * this.cellSize;
                ctx.fillRect(x, y, this.cellSize, this.cellSize);
                ctx.strokeRect(x, y, this.cellSize, this.cellSize);
            }
        }
    }
}
