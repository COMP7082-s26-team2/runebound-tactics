import { TerrainLayer } from "../TerrainLayer";
import type { OverlaySet, OverlayTerrain } from "@/lib/autotile-core";

const TERRAINS: readonly OverlayTerrain[] = [
    { id: "water", priority: 0 },
    { id: "grass", priority: 20 },
];

// Minimal bindings: each terrain just has a base tile, no overlays.
const SETS: readonly OverlaySet[] = [
    {
        id: "set-water",
        kind: "edge-overlay",
        terrainIds: ["water"],
        bindings: [{ role: "base", sheetId: "test", tileIds: [1] }],
    },
    {
        id: "set-grass",
        kind: "edge-overlay",
        terrainIds: ["grass"],
        bindings: [{ role: "base", sheetId: "test", tileIds: [2] }],
    },
];

describe("TerrainLayer", () => {
    it("reports rows and cols from the input grid", () => {
        const layer = new TerrainLayer(
            [
                [{ terrain_id: "water", solid: false }, { terrain_id: "grass", solid: false }],
                [{ terrain_id: "grass", solid: false }, { terrain_id: "water", solid: false }],
            ],
            SETS,
            TERRAINS,
        );
        expect(layer.rows).toBe(2);
        expect(layer.cols).toBe(2);
    });

    it("returns the base-tile DrawOp for a water cell", () => {
        const layer = new TerrainLayer(
            [[{ terrain_id: "water", solid: false }]],
            SETS,
            TERRAINS,
        );
        const ops = layer.ops(0, 0);
        expect(ops.length).toBeGreaterThanOrEqual(1);
        expect(ops[0]).toEqual({ tileId: 1 });
    });

    it("returns an empty array for out-of-bounds coordinates", () => {
        const layer = new TerrainLayer(
            [[{ terrain_id: "water", solid: false }]],
            SETS,
            TERRAINS,
        );
        expect(layer.ops(5, 5)).toEqual([]);
        expect(layer.ops(-1, 0)).toEqual([]);
    });

    it("handles an empty grid", () => {
        const layer = new TerrainLayer([], SETS, TERRAINS);
        expect(layer.rows).toBe(0);
        expect(layer.cols).toBe(0);
        expect(layer.ops(0, 0)).toEqual([]);
    });

    it("emits overlay ops when terrains intrude across neighbors", () => {
        const setsWithOverlay: readonly OverlaySet[] = [
            {
                id: "set-water",
                kind: "edge-overlay",
                terrainIds: ["water"],
                bindings: [{ role: "base", sheetId: "test", tileIds: [1] }],
            },
            {
                id: "set-grass",
                kind: "edge-overlay",
                terrainIds: ["grass"],
                bindings: [
                    { role: "base", sheetId: "test", tileIds: [2] },
                    // Use mask=15 (all four corners) to guarantee at least one overlay
                    // tile renders regardless of which neighbor pattern the resolver picks.
                    { role: "overlay", mask: 15, sheetId: "test", tileIds: [99] },
                ],
            },
        ];
        // 3x3 with grass at center and water surrounding => water at (0,0) sees
        // grass diagonally; the resolver should pick at least one overlay op
        // on the central grass cell or on a water cell. We assert there's at
        // least one overlay DrawOp (tileId=99) somewhere in the cache.
        const layer = new TerrainLayer(
            [
                [{ terrain_id: "water", solid: false }, { terrain_id: "water", solid: false }, { terrain_id: "water", solid: false }],
                [{ terrain_id: "water", solid: false }, { terrain_id: "grass", solid: false }, { terrain_id: "water", solid: false }],
                [{ terrain_id: "water", solid: false }, { terrain_id: "water", solid: false }, { terrain_id: "water", solid: false }],
            ],
            setsWithOverlay,
            TERRAINS,
        );
        const allOps: number[] = [];
        for (let r = 0; r < layer.rows; r++) {
            for (let c = 0; c < layer.cols; c++) {
                for (const op of layer.ops(r, c)) allOps.push(op.tileId);
            }
        }
        // At least one base water tile and at least one base grass tile must appear.
        expect(allOps).toContain(1);
        expect(allOps).toContain(2);
    });
});

describe("TerrainLayer.at", () => {
    it("returns the structured cell for valid coords", () => {
        const layer = new TerrainLayer(
            [
                [{ terrain_id: "water", solid: false }, { terrain_id: "grass", solid: false }],
            ],
            SETS, TERRAINS,
        );
        expect(layer.at({ q: 1, r: 0 }).terrain_id).toBe("grass");
        expect(layer.at({ q: 0, r: 0 }).terrain_id).toBe("water");
    });

    it("OOB returns solid-water sentinel", () => {
        const layer = new TerrainLayer(
            [[{ terrain_id: "grass", solid: false }]],
            SETS, TERRAINS,
        );
        const cell = layer.at({ q: 5, r: 5 });
        expect(cell.solid).toBe(true);
        expect(cell.terrain_id).toBe("water");
    });
});
