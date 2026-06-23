import { terrainAt, CHOKEPOINT_MAP } from "../src/game/terrain";

describe("terrainAt", () => {
    it("returns the cell at a valid coord", () => {
        // (1,1) is grass in chokepointMap
        expect(terrainAt(CHOKEPOINT_MAP, 1, 1).terrain_id).toBe("grass");
        // (0,0) is water boundary
        expect(terrainAt(CHOKEPOINT_MAP, 0, 0).terrain_id).toBe("water");
    });

    it("OOB negative coord returns solid-water sentinel", () => {
        const cell = terrainAt(CHOKEPOINT_MAP, -1, 0);
        expect(cell.terrain_id).toBe("water");
        expect(cell.solid).toBe(true);
    });

    it("OOB beyond grid returns solid-water sentinel", () => {
        const cell = terrainAt(CHOKEPOINT_MAP, 999, 999);
        expect(cell.terrain_id).toBe("water");
        expect(cell.solid).toBe(true);
    });
});

describe("CHOKEPOINT_MAP shape", () => {
    it("is 10x10", () => {
        expect(CHOKEPOINT_MAP.length).toBe(10);
        for (const row of CHOKEPOINT_MAP) {
            expect(row.length).toBe(10);
        }
    });

    it("contains all three terrain ids", () => {
        const ids = new Set<string>();
        for (const row of CHOKEPOINT_MAP) {
            for (const cell of row) ids.add(cell.terrain_id);
        }
        expect(ids).toEqual(new Set(["water", "flatgrass", "grass"]));
    });
});
