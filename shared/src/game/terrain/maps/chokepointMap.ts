import type { TerrainGrid } from "../terrainGrid";

/**
 * Static authored map (the BCOMP-137 chokepoint layout). 10x10 with two
 * grass islands joined by a flatgrass strait through water.
 *
 * Shorthand kept as the human-editable source. Expanded to TerrainGrid
 * at module load. To author a new map, copy this file, change SHORTHAND.
 */
const SHORTHAND: ReadonlyArray<ReadonlyArray<string>> = [
    ["W","W","W","W","W","W","W","W","W","W"],
    ["W","G","G","G","F","W","W","W","W","W"],
    ["W","G","G","G","F","W","W","F","F","W"],
    ["W","G","G","G","F","W","F","F","F","W"],
    ["W","W","F","F","F","F","F","F","F","W"],
    ["W","W","W","F","F","F","W","W","W","W"],
    ["W","F","F","F","G","G","G","G","W","W"],
    ["W","F","F","F","G","G","G","G","W","W"],
    ["W","F","F","W","G","G","G","G","W","W"],
    ["W","W","W","W","W","W","W","W","W","W"],
];

const EXPAND: Readonly<Record<string, string>> = {
    W: "water", F: "flatgrass", G: "grass",
};

/**
 * solid=false everywhere — water is impassable to infantry via canEnter
 * (no MOVEMENT_TYPES.infantry[water] entry), not via the solid veto.
 * solid:true is reserved for map boundaries / mountain walls (no future
 * unit can ever enter).
 */
export const CHOKEPOINT_MAP: TerrainGrid = SHORTHAND.map((row) =>
    row.map((sh) => ({
        terrain_id: EXPAND[sh] ?? "water",
        solid: false,
    })),
);
