/**
 * Turn FSM — event union, context shape, payload types.
 *
 * action-phase     — active player's turn; waiting for move/attack/end-turn input.
 * declare-end-turn — player declared end of turn; turn-advance in progress.
 * quick-play       — placeholder: opponent response window (card system pending).
 * combat           — resolving a pending attack (damage applied, unit possibly removed).
 * post-combat      — placeholder: death cleanup + gold award (gold system pending).
 */

export type TurnState =
    | "action-phase"
    | "declare-end-turn"
    | "quick-play"
    | "combat"
    | "post-combat";

export type TurnEvent =
    | "END_TURN"
    | "ALL_UNITS_MOVED"
    | "ATTACK_DECLARED"
    | "QUICK_PLAY_RESOLVED"
    | "COMBAT_RESOLVED"
    | "POST_COMBAT_RESOLVED"
    | "TURN_ADVANCED";

export interface TurnContext {
    currentPlayerId: string;
}

export interface TurnAdvancedPayload {
    playerId: string;
}
