import {
    resolveCellOps,
    type DrawOp,
    type OverlaySet,
    type OverlayTerrain,
} from "@/lib/autotile-core";
import {
    terrainAt,
    type TerrainCell,
    type TerrainGrid,
} from "@runebound-tactics/shared";

export class TerrainLayer {
    readonly rows: number;
    readonly cols: number;
    private readonly _grid: TerrainGrid;
    private readonly _cache: ReadonlyArray<ReadonlyArray<readonly DrawOp[]>>;

    constructor(
        terrainGrid: TerrainGrid,
        sets: readonly OverlaySet[],
        terrains: readonly OverlayTerrain[],
    ) {
        this._grid = terrainGrid;
        this.rows = terrainGrid.length;
        this.cols = this.rows > 0 ? terrainGrid[0]!.length : 0;

        // Renderer needs a string-grid; project terrain_id out for the
        // autotile resolver. Cosmetic-only — `_grid` keeps the structured shape.
        const flat: (string | null)[][] = terrainGrid.map((row) =>
            row.map((cell) => cell.terrain_id),
        );

        const cache: DrawOp[][][] = [];
        for (let r = 0; r < this.rows; r++) {
            const row: DrawOp[][] = [];
            for (let c = 0; c < this.cols; c++) {
                row.push(resolveCellOps(flat, r, c, sets, terrains));
            }
            cache.push(row);
        }
        this._cache = cache;
    }

    ops(r: number, c: number): readonly DrawOp[] {
        return this._cache[r]?.[c] ?? [];
    }

    /**
     * Gameplay-shape view of the cell. Used by movement collision
     * (canEnter / moveCost). Out-of-bounds returns a solid-water sentinel
     * via shared `terrainAt`.
     */
    at(coord: { q: number; r: number }): TerrainCell {
        return terrainAt(this._grid, coord.r, coord.q);
    }
}
