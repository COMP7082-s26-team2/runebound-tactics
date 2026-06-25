/**
 * Per-cell gameplay shape (LOCKED by tile_mapping_design_v2.1 §9).
 * Cosmetic Wang resolution happens elsewhere via TerrainLayer + autotile-core.
 */
export interface TerrainCell {
    readonly terrain_id: string;
    readonly solid: boolean;
}

/** 2D grid of gameplay cells. world[r][q]. */
export type TerrainGrid = ReadonlyArray<ReadonlyArray<TerrainCell>>;

const OOB_SENTINEL: TerrainCell = { terrain_id: "water", solid: true } as const;
let _oobWarned = false;

/**
 * Safe-by-default cell lookup. Out-of-bounds returns a solid-water sentinel
 * and emits one console.warn per process so the bug is observable without
 * crashing the render loop or move-validation path.
 */
export function terrainAt(grid: TerrainGrid, r: number, q: number): TerrainCell {
    const cell = grid[r]?.[q];
    if (cell !== undefined) return cell;
    if (!_oobWarned) {
        // eslint-disable-next-line no-console
        console.warn(
            `[terrainAt] OOB lookup at (r=${r}, q=${q}); returning solid-water sentinel. Further OOBs suppressed.`,
        );
        _oobWarned = true;
    }
    return OOB_SENTINEL;
}
