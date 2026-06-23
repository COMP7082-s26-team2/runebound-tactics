import { MovementType } from "./movementType";
import { TerrainClass } from "./terrainClass";

export interface WalkableEntry {
    /** Move-cost multiplier. Defaults to 1 if absent (used in Phase 2 / Dijkstra). */
    readonly cost?: number;
}

/** Sparse: absence of key = unit cannot enter that TerrainClass. */
export type WalkTable = Partial<Readonly<Record<TerrainClass, WalkableEntry>>>;

export const MOVEMENT_TYPES: Readonly<Record<MovementType, WalkTable>> = {
    [MovementType.Infantry]:   { [TerrainClass.Land]:  {} },
    [MovementType.Naval]:      { [TerrainClass.Water]: {} },
    [MovementType.Amphibious]: { [TerrainClass.Land]:  {}, [TerrainClass.Water]: { cost: 2 } },
};
