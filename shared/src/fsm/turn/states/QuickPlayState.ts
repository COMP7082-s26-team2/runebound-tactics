import { StateBase, type TransitionResult } from "../../StateBase";
import type { TurnContext, TurnEvent } from "../events";

/**
 * Placeholder: opponent response window (card/ability system pending).
 *
 * Immediately resolved by the GameRoom subscriber (logs and fires
 * QUICK_PLAY_RESOLVED synchronously). No guard, no context mutation.
 */
export class QuickPlayState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "quick-play";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        _payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "QUICK_PLAY_RESOLVED") {
            return "combat";
        }
        return null;
    }
}
