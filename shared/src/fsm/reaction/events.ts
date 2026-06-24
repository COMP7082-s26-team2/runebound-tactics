/**
 * Reaction Window FSM — event union, context shape.
 *
 * defender       — defending player may play reaction cards or pass.
 * defender-ally  — placeholder: defending player's ally window (multi-player pending).
 * attacker-ally  — placeholder: attacking player's ally window (multi-player pending).
 * resolve        — all cards locked in; window about to close.
 * closed         — machine terminal state; GameRoom fires QUICK_PLAY_RESOLVED.
 */

export type ReactionWindowState =
    | "defender"
    | "defender-ally"
    | "attacker-ally"
    | "resolve"
    | "closed";

export type ReactionWindowEvent =
    | "PLAY_CARD"
    | "REACTION_PASS"
    | "REACTION_TIMEOUT";

export interface ReactionWindowContext {
    attackerOwnerId: string;
    defenderOwnerId: string;
    cardsPlayed: Array<{ playerId: string; cardId: string }>;
}
