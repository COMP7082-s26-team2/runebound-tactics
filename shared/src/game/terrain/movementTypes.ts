import type { MovementType } from "./movementType";
import type { TerrainClass } from "./terrainClass";

export interface WalkableEntry {
    /** Move-cost multiplier. Defaults to 1 if absent (used in Phase 2 / Dijkstra). */
    readonly cost?: number;
}

/** Sparse: absence of key = unit cannot enter that TerrainClass. */
export type WalkTable = Partial<Readonly<Record<TerrainClass, WalkableEntry>>>;

import { MovementType as MT } from "./movementType";
import { TerrainClass as TC } from "./terrainClass";

export const MOVEMENT_TYPES: Readonly<Record<MovementType, WalkTable>> = {
    [MT.Infantry]:   { [TC.Land]:  {} },
    [MT.Naval]:      { [TC.Water]: {} },
    [MT.Amphibious]: { [TC.Land]:  {}, [TC.Water]: { cost: 2 } },
};
