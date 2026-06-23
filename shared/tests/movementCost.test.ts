import {
    canEnter,
    moveCost,
    MovementType,
} from "../src/game/terrain";
import type { TerrainCell } from "../src/game/terrain";

const land: TerrainCell  = { terrain_id: "grass", solid: false };
const water: TerrainCell = { terrain_id: "water", solid: false };
const solid: TerrainCell = { terrain_id: "grass", solid: true  };
const unknownTerrain: TerrainCell = { terrain_id: "lava", solid: false };

const infantry   = { movementType: MovementType.Infantry };
const naval      = { movementType: MovementType.Naval };
const amphibious = { movementType: MovementType.Amphibious };

describe("canEnter", () => {
    it("infantry walks land, not water", () => {
        expect(canEnter(infantry, land)).toBe(true);
        expect(canEnter(infantry, water)).toBe(false);
    });

    it("naval walks water, not land", () => {
        expect(canEnter(naval, water)).toBe(true);
        expect(canEnter(naval, land)).toBe(false);
    });

    it("amphibious walks both", () => {
        expect(canEnter(amphibious, land)).toBe(true);
        expect(canEnter(amphibious, water)).toBe(true);
    });

    it("solid blocks everyone", () => {
        expect(canEnter(infantry, solid)).toBe(false);
        expect(canEnter(naval, solid)).toBe(false);
        expect(canEnter(amphibious, solid)).toBe(false);
    });

    it("unknown terrain_id throws", () => {
        expect(() => canEnter(infantry, unknownTerrain)).toThrow(/unknown terrain_id/);
    });
});

describe("moveCost", () => {
    it("returns 1 for default (no cost field)", () => {
        expect(moveCost(infantry, land)).toBe(1);
        expect(moveCost(naval, water)).toBe(1);
    });

    it("returns 2 for amphibious through water (explicit cost)", () => {
        expect(moveCost(amphibious, water)).toBe(2);
    });

    it("returns Infinity for impassable", () => {
        expect(moveCost(infantry, water)).toBe(Infinity);
        expect(moveCost(naval, land)).toBe(Infinity);
        expect(moveCost(infantry, solid)).toBe(Infinity);
    });
});
