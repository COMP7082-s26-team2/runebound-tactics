import { Grid, GridCoord } from "./Grid";

export class SquareGrid implements Grid {
    constructor(private cellSize: number) { }

    gridToWorld({ q, r }: GridCoord) {
        return {
            x: q * this.cellSize,
            y: r * this.cellSize,
        };
    }

    worldToGrid(x: number, y: number): GridCoord {
        return {
            q: Math.floor(x / this.cellSize),
            r: Math.floor(y / this.cellSize),
        };
    }

    getNeighbors({ q, r }: GridCoord): GridCoord[] {
        return [
            { q: q + 1, r },
            { q: q - 1, r },
            { q, r: r + 1 },
            { q, r: r - 1 },
        ];
    }

    distance(a: GridCoord, b: GridCoord): number {
        return Math.abs(a.q - b.q) + Math.abs(a.r - b.r);
    }

    getCellSize() {
        return this.cellSize;
    }
}