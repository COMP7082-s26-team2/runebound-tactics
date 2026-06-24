import { StateBase, type TransitionResult } from "../../StateBase";
import type { ReactionWindowContext, ReactionWindowEvent } from "../events";

/** Terminal state. GameRoom subscriber fires QUICK_PLAY_RESOLVED on entry. */
export class ClosedState extends StateBase<ReactionWindowContext, ReactionWindowEvent> {
    readonly name = "closed";

    handle(
        _event: ReactionWindowEvent,
        _ctx: ReactionWindowContext,
        _payload?: unknown,
    ): TransitionResult<ReactionWindowContext> {
        return null;
    }
}
