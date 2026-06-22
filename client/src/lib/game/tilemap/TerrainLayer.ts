import {
    resolveCellOps,
    type DrawOp,
    type OverlaySet,
    type OverlayTerrain,
} from "@/lib/autotile-core";

export class TerrainLayer {
    readonly rows: number;
    readonly cols: number;
    private readonly _cache: ReadonlyArray<ReadonlyArray<readonly DrawOp[]>>;

    constructor(
        terrainGrid: ReadonlyArray<ReadonlyArray<string | null>>,
        sets: readonly OverlaySet[],
        terrains: readonly OverlayTerrain[],
    ) {
        this.rows = terrainGrid.length;
        this.cols = this.rows > 0 ? terrainGrid[0]!.length : 0;
        const cache: DrawOp[][][] = [];
        for (let r = 0; r < this.rows; r++) {
            const row: DrawOp[][] = [];
            for (let c = 0; c < this.cols; c++) {
                row.push(resolveCellOps(terrainGrid, r, c, sets, terrains));
            }
            cache.push(row);
        }
        this._cache = cache;
    }

    ops(r: number, c: number): readonly DrawOp[] {
        return this._cache[r]?.[c] ?? [];
    }
}
