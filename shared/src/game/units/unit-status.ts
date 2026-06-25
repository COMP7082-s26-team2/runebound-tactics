import { AP_COST } from "../ActionPointSystem";

export function unitIsExhausted(unit: { actionPoints: number }): boolean {
    return unit.actionPoints < AP_COST.MOVE;
}
