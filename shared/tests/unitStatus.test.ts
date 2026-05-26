import { unitIsExhausted } from "../src/game/units/unit-status";

describe("unitIsExhausted", () => {
    it("returns true when hasMoved is true", () => {
        expect(unitIsExhausted({ hasMoved: true })).toBe(true);
    });

    it("returns false when hasMoved is false", () => {
        expect(unitIsExhausted({ hasMoved: false })).toBe(false);
    });

    it("accepts a minimal structural object (LiteUnit shape)", () => {
        const lite = {
            unitId: "u1",
            ownerId: "p1",
            unitType: "castle:swordsman",
            x: 0,
            y: 0,
            hasMoved: true,
        };
        expect(unitIsExhausted(lite)).toBe(true);
    });

    it("accepts an object with extra schema-class-style fields", () => {
        const schemaLike = {
            unitId: "u1",
            ownerId: "p1",
            unitType: "castle:swordsman",
            x: 0,
            y: 0,
            hp: 30,
            maxHp: 30,
            hasActed: false,
            hasMoved: false,
        };
        expect(unitIsExhausted(schemaLike)).toBe(false);
    });
});
