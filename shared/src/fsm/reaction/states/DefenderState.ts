import { StateBase, type TransitionResult } from "../../StateBase";
import type { ReactionWindowContext, ReactionWindowEvent } from "../events";

/**
 * Defending player may play reaction cards or pass.
 *
 * REACTION_PASS / REACTION_TIMEOUT → "defender-ally"
 * PLAY_CARD                        → self-loop; appends card to ctx.cardsPlayed
 */
export class DefenderState extends StateBase<ReactionWindowContext, ReactionWindowEvent> {
    readonly name = "defender";

    handle(
        event: ReactionWindowEvent,
        _ctx: ReactionWindowContext,
        payload?: unknown,
    ): TransitionResult<ReactionWindowContext> {
        if (event === "REACTION_PASS" || event === "REACTION_TIMEOUT") {
            return "defender-ally";
        }
        if (event === "PLAY_CARD") {
            const p = payload as { playerId: string; cardId: string };
            return {
                target: "defender",
                action: (c) => ({
                    cardsPlayed: [...c.cardsPlayed, { playerId: p.playerId, cardId: p.cardId }],
                }),
            };
        }
        return null;
    }
}
