/**
 * Turn FSM — event union, context shape, payload types.
 *
 * active     — one player's turn is in progress.
 * resolving  — turn-end transition: host (server or LocalGameSession)
 *              subscribes and performs schema-side work (reset hasMoved /
 *              actionPoints, write currentTurnId), then fires TURN_ADVANCED.
 */

export type TurnState = "active" | "resolving";

export type TurnEvent =
    | "END_TURN"
    | "ALL_UNITS_MOVED"
    | "TURN_ADVANCED";

export interface TurnContext {
    currentPlayerId: string;
}

export interface TurnAdvancedPayload {
    playerId: string;
}
