import { unitIsExhausted } from "../src/game/units/unit-status";
import { AP_COST } from "../src/game/ActionPointSystem";

describe("unitIsExhausted", () => {
    it("returns true when actionPoints is 0", () => {
        expect(unitIsExhausted({ actionPoints: 0 })).toBe(true);
    });

    it("returns false when actionPoints meets MOVE cost", () => {
        expect(unitIsExhausted({ actionPoints: AP_COST.MOVE })).toBe(false);
    });

    it("returns false when actionPoints exceeds MOVE cost", () => {
        expect(unitIsExhausted({ actionPoints: AP_COST.MOVE + 1 })).toBe(false);
    });

    it("accepts a minimal structural object", () => {
        expect(unitIsExhausted({ actionPoints: 2 })).toBe(false);
        expect(unitIsExhausted({ actionPoints: 0 })).toBe(true);
    });
});
