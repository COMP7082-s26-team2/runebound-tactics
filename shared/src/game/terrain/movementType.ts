/**
 * Locomotion category a unit uses. Resolves to a sparse row in
 * MOVEMENT_TYPES whose presence/absence in each TerrainClass column
 * answers "can this unit walk that class?".
 */
export const MovementType = {
    Infantry:   "infantry",
    Naval:      "naval",
    Amphibious: "amphibious",
} as const;

export type MovementType = typeof MovementType[keyof typeof MovementType];
