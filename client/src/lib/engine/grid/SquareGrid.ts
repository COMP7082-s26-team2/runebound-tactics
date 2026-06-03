import { Grid, GridCoord } from "./Grid";
import { Vector2D } from "@/lib/engine/core";

export class SquareGrid implements Grid {
    constructor(private _cellSize: number) {}

    gridToWorld({ q, r }: GridCoord): Vector2D {
        return Vector2D.of(q * this._cellSize, r * this._cellSize);
    }

    worldToGrid(x: number, y: number): GridCoord {
        return {
            q: Math.floor(x / this._cellSize),
            r: Math.floor(y / this._cellSize),
        };
    }

    getNeighbors({ q, r }: GridCoord): GridCoord[] {
        return [
            { q: q + 1, r }, // right
            { q: q - 1, r }, // left
            { q, r: r + 1 }, // down
            { q, r: r - 1 }, // up
        ];
    }

    distance(a: GridCoord, b: GridCoord): number {
        return Math.abs(a.q - b.q) + Math.abs(a.r - b.r);
    }

    getCellSize() {
        return this._cellSize;
    }
}
