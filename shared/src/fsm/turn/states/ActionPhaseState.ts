import { StateBase, type TransitionResult } from "../../StateBase";
import type { TurnContext, TurnEvent } from "../events";

/**
 * The active player is issuing moves and attacks.
 *
 * END_TURN / ALL_UNITS_MOVED   → "declare-end-turn"  (turn-advance pipeline)
 * ATTACK_DECLARED              → "quick-play"         (combat resolution pipeline)
 *
 * Pure-shared rule: no Colyseus / World calls here. All side effects belong
 * in the GameRoom (or other host) subscriber.
 */
export class ActionPhaseState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "action-phase";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        _payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "END_TURN" || event === "ALL_UNITS_MOVED") {
            return "declare-end-turn";
        }
        if (event === "ATTACK_DECLARED") {
            return "quick-play";
        }
        return null;
    }
}
