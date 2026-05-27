import { StateBase, type TransitionResult } from "../../StateBase";
import type {
    TurnContext,
    TurnEvent,
    TurnAdvancedPayload,
} from "../events";

/**
 * Turn-end transition holding state.
 *
 * IMPORTANT: do NOT call into Colyseus, the World, or any host-only API
 * from `onEntry`/`onExit`/`handle`/action lambdas in this class. State
 * classes run in shared code and must be pure (modulo `Ctx` mutation).
 *
 * The host (server `GameRoom` or client `LocalGameSession`) subscribes to
 * the Machine and performs schema-side work (reset hasMoved /
 * actionPoints, write currentTurnId) when state becomes "resolving", then
 * fires TURN_ADVANCED. See state_machine_shared_design_v3.0 §G5.
 */
export class ResolvingState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "resolving";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "TURN_ADVANCED") {
            const p = payload as TurnAdvancedPayload;
            return {
                target: "active",
                action: () => ({ currentPlayerId: p.playerId }),
            };
        }
        return null;
    }
}
