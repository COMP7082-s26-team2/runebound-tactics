import { World, GameComponent } from "@/lib/engine";

export class GridRenderSystem implements GameComponent {
    constructor(
        private _world: World,
        private _gridCols: number,
        private _gridRows: number,
        private _cellSize: number,
    ) {}

    draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillStyle = "#333";
        for (let q = 0; q < this._gridCols; q++) {
            for (let r = 0; r < this._gridRows; r++) {
                const x = q * this._cellSize;
                const y = r * this._cellSize;
                ctx.fillRect(x, y, this._cellSize, this._cellSize);
                ctx.strokeRect(x, y, this._cellSize, this._cellSize);
            }
        }
    }
}
