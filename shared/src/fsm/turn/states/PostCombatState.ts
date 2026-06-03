import { StateBase, type TransitionResult } from "../../StateBase";
import type { TurnContext, TurnEvent } from "../events";

/**
 * Placeholder: death-animation hooks and gold-on-kill award (systems pending).
 *
 * Immediately resolved by the GameRoom subscriber (logs and fires
 * POST_COMBAT_RESOLVED synchronously), returning to "action-phase".
 */
export class PostCombatState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "post-combat";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        _payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "POST_COMBAT_RESOLVED") {
            return "action-phase";
        }
        return null;
    }
}
