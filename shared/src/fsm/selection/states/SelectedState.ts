import { StateBase, type TransitionResult } from "../../StateBase";
import type {
    SelectionContext,
    SelectionEvent,
    AttackPositionChosenPayload,
} from "../events";
import { clearSelectionContext } from "./_helpers";

export class SelectedState extends StateBase<SelectionContext, SelectionEvent> {
    readonly name = "selected";

    handle(
        event: SelectionEvent,
        _ctx: SelectionContext,
        payload?: unknown,
    ): TransitionResult<SelectionContext> {
        // AP (1-AP model, attack-targeting design v1.1):
        // Both ATTACK_POSITION_CHOSEN and MOVE_REQUESTED ultimately flip
        // hasMoved on the unit via their server handlers. The unitIsExhausted
        // predicate becomes true after EITHER, blocking any further action
        // this turn. No additional FSM-level AP guard needed here — the gate
        // is on initial SELECT_FRIENDLY (MultiplayerSelectionSystem._isExhausted).

        if (event === "ATTACK_POSITION_CHOSEN") {
            const p = payload as AttackPositionChosenPayload;
            return {
                target: "awaiting-attack-target",
                action: () => ({
                    pendingAttackFrom: p.from,
                    pendingTargetCandidates: p.adjacentEnemies,
                }),
            };
        }

        if (event === "MOVE_REQUESTED" || event === "DESELECT") {
            return {
                target: "idle",
                action: () => clearSelectionContext(),
            };
        }

        return null;
    }
}
