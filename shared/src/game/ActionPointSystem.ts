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
        baseAp: number;
        bonusAp: number;
    }): void {
        unit.actionPoints = Math.max(0, unit.baseAp + unit.bonusAp);
    }
}
