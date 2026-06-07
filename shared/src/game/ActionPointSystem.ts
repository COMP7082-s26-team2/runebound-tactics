import { getUnitBaseAp, type UnitTypeId } from "./units/unit-stats";

export const AP_COST = {
    MOVE:   1,
    ATTACK: 1,
} as const;

export class ActionPointSystem {
    static canAfford(unit: { actionPoints: number }, cost: number): boolean {
        return unit.actionPoints >= cost;
    }

    static deduct(unit: { actionPoints: number }, cost: number): void {
        unit.actionPoints = Math.max(0, unit.actionPoints - cost);
    }

    static restore(unit: {
        actionPoints: number;
        bonusAp: number;
        unitType: string;
    }): void {
        unit.actionPoints =
            getUnitBaseAp(unit.unitType as UnitTypeId) + unit.bonusAp;
    }
}
