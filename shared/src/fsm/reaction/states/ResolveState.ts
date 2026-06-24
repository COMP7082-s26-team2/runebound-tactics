import { StateBase, type TransitionResult } from "../../StateBase";
import type { ReactionWindowContext, ReactionWindowEvent } from "../events";

/** All cards are locked in; window is closing. PLAY_CARD is ignored. */
export class ResolveState extends StateBase<ReactionWindowContext, ReactionWindowEvent> {
    readonly name = "resolve";

    handle(
        event: ReactionWindowEvent,
        _ctx: ReactionWindowContext,
        _payload?: unknown,
    ): TransitionResult<ReactionWindowContext> {
        if (event === "REACTION_PASS" || event === "REACTION_TIMEOUT") {
            return "closed";
        }
        return null;
    }
}
