import { drawTile } from "@/lib/autotile-core/canvas";
import { GameComponent } from "@/lib/engine";
import type { TerrainLayer } from "@/lib/game/tilemap";

export class GridRenderSystem implements GameComponent {
    constructor(
        private _terrainLayer: TerrainLayer,
        private _sheet: HTMLImageElement,
        private _cellSize: number,
        private _spriteCellSize: number = 16,
        private _spriteCols: number = 16,
    ) {}

    draw(ctx: CanvasRenderingContext2D) {
        for (let r = 0; r < this._terrainLayer.rows; r++) {
            for (let c = 0; c < this._terrainLayer.cols; c++) {
                const ops = this._terrainLayer.ops(r, c);
                for (const op of ops) {
                    drawTile(ctx, this._sheet, op.tileId, r, c, op.clip, {
                        cellSize: this._cellSize,
                        spriteCellSize: this._spriteCellSize,
                        spriteCols: this._spriteCols,
                    });
                }
            }
        }
    }
}
