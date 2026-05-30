import { StateBase, type TransitionResult } from "../../StateBase";
import type { TurnContext, TurnEvent } from "../events";

/**
 * Resolving a pending attack: damage applied, unit possibly deleted.
 *
 * The GameRoom subscriber calls _resolvePendingAttack(), checks win
 * condition, and fires COMBAT_RESOLVED only if the game has not ended.
 * If the game ends here, the machine stays in "combat" permanently —
 * correct, since no further messages are processed.
 */
export class CombatState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "combat";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        _payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "COMBAT_RESOLVED") {
            return "post-combat";
        }
        return null;
    }
}
