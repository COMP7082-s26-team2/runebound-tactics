import { ActionPointSystem, AP_COST } from "../src/game/ActionPointSystem";
import { unitIsExhausted } from "../src/game/units/unit-status";
import { getUnitBaseAp } from "../src/game/units/unit-stats";

const unit = (ap: number) => ({ actionPoints: ap });
const spawnUnit = (unitType: string, bonusAp = 0) => ({
    actionPoints: 0,
    baseAp: getUnitBaseAp(unitType),
    bonusAp,
});

describe("ActionPointSystem.canAfford", () => {
    it("returns true when AP exceeds cost", () => {
        expect(ActionPointSystem.canAfford(unit(3), 2)).toBe(true);
    });

    it("returns true on exact match", () => {
        expect(ActionPointSystem.canAfford(unit(1), 1)).toBe(true);
    });

    it("returns false when AP is insufficient", () => {
        expect(ActionPointSystem.canAfford(unit(0), 1)).toBe(false);
    });
});

describe("ActionPointSystem.deduct", () => {
    it("decrements actionPoints by cost", () => {
        const u = unit(2);
        ActionPointSystem.deduct(u, AP_COST.MOVE);
        expect(u.actionPoints).toBe(1);
    });

    it("clamps to 0 on over-spend", () => {
        const u = unit(0);
        ActionPointSystem.deduct(u, AP_COST.ATTACK);
        expect(u.actionPoints).toBe(0);
    });
});

describe("ActionPointSystem.restore", () => {
    it("sets actionPoints to baseAp when bonusAp is 0", () => {
        const u = spawnUnit("castle:swordsman");
        ActionPointSystem.restore(u);
        expect(u.actionPoints).toBe(getUnitBaseAp("castle:swordsman"));
    });

    it("sets actionPoints to baseAp + bonusAp", () => {
        const u = spawnUnit("castle:swordsman", 1);
        ActionPointSystem.restore(u);
        expect(u.actionPoints).toBe(getUnitBaseAp("castle:swordsman") + 1);
    });

    it("clamps to 0 when baseAp + bonusAp would be negative", () => {
        const u = spawnUnit("castle:swordsman", -10);
        ActionPointSystem.restore(u);
        expect(u.actionPoints).toBe(0);
    });
});

describe("unitIsExhausted", () => {
    it("returns true when actionPoints is 0", () => {
        expect(unitIsExhausted({ actionPoints: 0 })).toBe(true);
    });

    it("returns false when actionPoints meets MOVE cost", () => {
        expect(unitIsExhausted({ actionPoints: AP_COST.MOVE })).toBe(false);
    });
});
