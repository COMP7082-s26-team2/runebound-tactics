import { StateBase, type TransitionResult } from "../../StateBase";
import type { ReactionWindowContext, ReactionWindowEvent } from "../events";

/** Placeholder: attacking player's ally window (multi-player pending). */
export class AttackerAllyState extends StateBase<ReactionWindowContext, ReactionWindowEvent> {
    readonly name = "attacker-ally";

    handle(
        event: ReactionWindowEvent,
        _ctx: ReactionWindowContext,
        payload?: unknown,
    ): TransitionResult<ReactionWindowContext> {
        if (event === "REACTION_PASS" || event === "REACTION_TIMEOUT") {
            return "resolve";
        }
        if (event === "PLAY_CARD") {
            const p = payload as { playerId: string; cardId: string };
            return {
                target: "attacker-ally",
                action: (c) => ({
                    cardsPlayed: [...c.cardsPlayed, { playerId: p.playerId, cardId: p.cardId }],
                }),
            };
        }
        return null;
    }
}
