import {
    getEffectiveMaxHealth,
    getEffectiveAttack,
    getEffectiveDefense,
    getEffectiveMovement,
    getEffectiveAp,
    getUnitDamageType,
    getUnitDefaultWeakness,
} from "../src/game/units/unit-stats";

describe("effective-stat helpers", () => {
    it("returns base + bonus", () => {
        expect(getEffectiveMaxHealth({ baseMaxHealth: 30, bonusMaxHealth: 5 })).toBe(35);
        expect(getEffectiveAttack({ baseAttackDamage: 6, bonusAttackDamage: 2 })).toBe(8);
        expect(getEffectiveDefense({ baseDefense: 3, bonusDefense: 1 })).toBe(4);
        expect(getEffectiveMovement({ baseMovement: 3, bonusMovement: 1 })).toBe(4);
        expect(getEffectiveAp({ baseAp: 2, bonusAp: 1 })).toBe(3);
    });

    it("returns base when bonus is 0", () => {
        expect(getEffectiveMaxHealth({ baseMaxHealth: 30, bonusMaxHealth: 0 })).toBe(30);
        expect(getEffectiveAttack({ baseAttackDamage: 6, bonusAttackDamage: 0 })).toBe(6);
    });

    it("clamps to 0 when base + bonus would be negative", () => {
        expect(getEffectiveDefense({ baseDefense: 2, bonusDefense: -5 })).toBe(0);
        expect(getEffectiveAp({ baseAp: 2, bonusAp: -10 })).toBe(0);
    });

    it("returns 0 when both base and bonus are 0", () => {
        expect(getEffectiveMaxHealth({ baseMaxHealth: 0, bonusMaxHealth: 0 })).toBe(0);
    });
});

describe("RPS weakness mapping", () => {
    it("melee is weak to cavalry", () => {
        expect(getUnitDefaultWeakness("castle:swordsman")).toContain("cavalry");
    });

    it("cavalry is weak to range", () => {
        expect(getUnitDefaultWeakness("castle:cavalier")).toContain("range");
    });

    it("range is weak to melee", () => {
        expect(getUnitDefaultWeakness("castle:archer")).toContain("melee");
    });

    it("pure has no weakness", () => {
        expect(getUnitDefaultWeakness("necropolis:ghost")).toEqual([]);
    });

    it("unknown unit type returns empty weakness list", () => {
        expect(getUnitDefaultWeakness("unknown:unit")).toEqual([]);
    });
});

describe("damage type", () => {
    it("returns correct damage type for known units", () => {
        expect(getUnitDamageType("castle:swordsman")).toBe("melee");
        expect(getUnitDamageType("castle:cavalier")).toBe("cavalry");
        expect(getUnitDamageType("castle:archer")).toBe("range");
        expect(getUnitDamageType("necropolis:ghost")).toBe("pure");
    });

    it("returns null for unknown unit type", () => {
        expect(getUnitDamageType("unknown:unit")).toBeNull();
    });
});
