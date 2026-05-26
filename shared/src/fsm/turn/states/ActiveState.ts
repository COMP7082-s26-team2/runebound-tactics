import { StateBase, type TransitionResult } from "../../StateBase";
import type { TurnContext, TurnEvent } from "../events";

export class ActiveState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "active";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        _payload?: unknown,
    ): TransitionResult<TurnContext> {
        // AP: ALL_UNITS_MOVED becomes "all actions consumed" in AP semantics.
        //     Event name kept for compatibility per v2.1 AP-7.
        if (event === "END_TURN" || event === "ALL_UNITS_MOVED") {
            return "resolving";
        }
        return null;
    }
}
