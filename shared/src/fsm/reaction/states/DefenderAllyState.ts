import { StateBase, type TransitionResult } from "../../StateBase";
import type { ReactionWindowContext, ReactionWindowEvent } from "../events";

/** Placeholder: defending player's ally window (multi-player pending). */
export class DefenderAllyState extends StateBase<ReactionWindowContext, ReactionWindowEvent> {
    readonly name = "defender-ally";

    handle(
        event: ReactionWindowEvent,
        _ctx: ReactionWindowContext,
        payload?: unknown,
    ): TransitionResult<ReactionWindowContext> {
        if (event === "REACTION_PASS" || event === "REACTION_TIMEOUT") {
            return "attacker-ally";
        }
        if (event === "PLAY_CARD") {
            const p = payload as { playerId: string; cardId: string };
            return {
                target: "defender-ally",
                action: (c) => ({
                    cardsPlayed: [...c.cardsPlayed, { playerId: p.playerId, cardId: p.cardId }],
                }),
            };
        }
        return null;
    }
}
