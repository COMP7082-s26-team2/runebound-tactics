import { StateBase, type TransitionResult } from "../../StateBase";
import type {
    SelectionContext,
    SelectionEvent,
    SelectFriendlyPayload,
} from "../events";

export class IdleState extends StateBase<SelectionContext, SelectionEvent> {
    readonly name = "idle";

    handle(
        event: SelectionEvent,
        _ctx: SelectionContext,
        payload?: unknown,
    ): TransitionResult<SelectionContext> {
        if (event === "SELECT_FRIENDLY") {
            const p = payload as SelectFriendlyPayload;
            return {
                target: "selected",
                action: () => ({
                    selectedUnitId: p.unitId,
                    reachableTiles: p.reachable,
                    attackableEnemies: p.attackable,
                    attackFromPositions: p.attackFromPositions,
                    pendingAttackFrom: null,
                    pendingTargetCandidates: new Set<string>(),
                }),
            };
        }
        return null;
    }
}
