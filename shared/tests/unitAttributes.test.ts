import {
    getEffectiveMaxHealth,
    getEffectiveAttack,
    getEffectiveDefense,
    getEffectiveMovement,
    getEffectiveAp,
    getUnitDamageType,
    getUnitDefaultWeakness,
    computeAttackDamage,
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

describe("computeAttackDamage — type effectiveness", () => {
    const makeAttacker = (baseAttackDamage: number, damageType: string) =>
        ({ baseAttackDamage, bonusAttackDamage: 0, damageType });

    const makeDefender = (baseDefense: number, weakness: string[]) =>
        ({ baseDefense, bonusDefense: 0, weakness });

    it("physical with weakness applies 1.5× multiplier before defense", () => {
        // floor(5 × 1.5) − 2 = 7 − 2 = 5
        expect(computeAttackDamage(
            makeAttacker(5, "cavalry"),
            makeDefender(2, ["cavalry"]),
        )).toBe(5);
    });

    it("physical without weakness uses flat attack minus defense", () => {
        // 5 − 2 = 3
        expect(computeAttackDamage(
            makeAttacker(5, "melee"),
            makeDefender(2, ["cavalry"]),
        )).toBe(3);
    });

    it("physical damage floors at 1 when attack is less than defense", () => {
        expect(computeAttackDamage(
            makeAttacker(2, "melee"),
            makeDefender(10, []),
        )).toBe(1);
    });

    it("pure damage bypasses defense entirely", () => {
        expect(computeAttackDamage(
            makeAttacker(4, "pure"),
            makeDefender(10, []),
        )).toBe(4);
    });

    it("pure damage can be 0 when effectiveAttack is 0", () => {
        expect(computeAttackDamage(
            makeAttacker(0, "pure"),
            makeDefender(10, []),
        )).toBe(0);
    });

    it("null damage type applies defense but no weakness interaction", () => {
        // 5 − 2 = 3 (weakness list ignored)
        expect(computeAttackDamage(
            makeAttacker(5, ""),
            makeDefender(2, ["melee"]),
        )).toBe(3);
    });

    it("null damage type floors at 1", () => {
        expect(computeAttackDamage(
            makeAttacker(1, ""),
            makeDefender(10, []),
        )).toBe(1);
    });

    it("cavalry beats melee — weakness hit deals more than no weakness", () => {
        const withWeakness = computeAttackDamage(
            makeAttacker(5, "cavalry"),
            makeDefender(2, ["cavalry"]),
        );
        const withoutWeakness = computeAttackDamage(
            makeAttacker(5, "cavalry"),
            makeDefender(2, []),
        );
        expect(withWeakness).toBeGreaterThan(withoutWeakness);
    });
});
