import { StateBase, type TransitionResult } from "../../StateBase";
import type {
    TurnContext,
    TurnEvent,
    TurnAdvancedPayload,
} from "../events";

/**
 * Turn-end transition holding state.
 *
 * The host (server GameRoom) subscribes, performs schema-side work
 * (reset hasMoved / hasActed, rotate currentTurnId, rebuild reachability
 * cache), then fires TURN_ADVANCED with the new player's ID.
 *
 * IMPORTANT: do NOT call into Colyseus, the World, or any host-only API
 * from this class. State classes must be pure (modulo Ctx mutation).
 */
export class DeclareEndTurnState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "declare-end-turn";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "TURN_ADVANCED") {
            const p = payload as TurnAdvancedPayload;
            return {
                target: "action-phase",
                action: () => ({ currentPlayerId: p.playerId }),
            };
        }
        return null;
    }
}
