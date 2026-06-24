/**
 * Categorical group used for movement lookups. terrain_id values from the
 * Wang split-key system (water / grass / flatgrass / cliff-edge-tl / etc.)
 * map to one TerrainClass each via TERRAIN_TABLE.
 */
export const TerrainClass = {
    Land:  "land",
    Water: "water",
} as const;

export type TerrainClass = typeof TerrainClass[keyof typeof TerrainClass];
