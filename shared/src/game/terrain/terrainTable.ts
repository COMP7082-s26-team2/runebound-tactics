import { TerrainClass } from "./terrainClass";

export interface TerrainEntry {
    readonly class: TerrainClass;
    /** Reserved for combat (tile_mapping_design_v2.1 §9 "cover/defense"). */
    readonly cover?: number;
}

/**
 * Maps each authored terrain_id (from bindings.json) to its movement class.
 * Lint test in shared/tests/terrainTable.test.ts asserts every bindings
 * terrain_id has an entry here. Missing => canEnter throws at runtime.
 */
export const TERRAIN_TABLE: Readonly<Record<string, TerrainEntry>> = {
    water:     { class: TerrainClass.Water },
    flatgrass: { class: TerrainClass.Land  },
    grass:     { class: TerrainClass.Land  },
};
