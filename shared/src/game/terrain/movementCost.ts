import { TERRAIN_TABLE } from "./terrainTable";
import { MOVEMENT_TYPES } from "./movementTypes";
import type { MovementType } from "./movementType";
import type { TerrainCell } from "./terrainGrid";

interface LocomotiveUnit {
    readonly movementType: MovementType;
}

/**
 * True iff `unit` can step onto `cell`. Combines solid veto + sparse
 * MOVEMENT_TYPES lookup. Throws on unknown terrain_id (loud failure
 * over silent miscategorization).
 */
export function canEnter(unit: LocomotiveUnit, cell: TerrainCell): boolean {
    if (cell.solid) return false;
    const entry = TERRAIN_TABLE[cell.terrain_id];
    if (!entry) throw new Error(`unknown terrain_id: ${cell.terrain_id}`);
    return MOVEMENT_TYPES[unit.movementType][entry.class] !== undefined;
}

/**
 * Per-step cost (Phase 2 reads this; Phase 1 doesn't gate on it).
 * Returns Infinity for impassable cells so a misuse never produces a
 * misleading low cost.
 */
export function moveCost(unit: LocomotiveUnit, cell: TerrainCell): number {
    if (cell.solid) return Infinity;
    const entry = TERRAIN_TABLE[cell.terrain_id];
    if (!entry) throw new Error(`unknown terrain_id: ${cell.terrain_id}`);
    const walkable = MOVEMENT_TYPES[unit.movementType][entry.class];
    if (!walkable) return Infinity;
    return walkable.cost ?? 1;
}
