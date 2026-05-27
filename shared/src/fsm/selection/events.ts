import type { GridCoord } from "../../types/grid";

/**
 * Selection FSM — event union, context shape, payload types.
 *
 * idle                    — no unit selected.
 * selected                — a friendly unit is selected; reachable + attackable
 *                           tiles are in context.
 * awaiting-attack-target  — player picked an attack-from tile (their own tile
 *                           OR a reachable tile adjacent to an enemy); waiting
 *                           for them to pick which enemy to attack.
 *
 * Per attack-targeting design v1.1 (1-AP unified flow):
 *   - No ATTACK_REQUESTED fast-path event. All attacks flow through
 *     ATTACK_POSITION_CHOSEN → ATTACK_TARGET_CHOSEN, even zero-move attacks
 *     (the attacker's current tile is a selectable attack-from when adjacent
 *     to enemies).
 */

export type SelectionState =
    | "idle"
    | "selected"
    | "awaiting-attack-target";

export type SelectionEvent =
    | "SELECT_FRIENDLY"
    | "MOVE_REQUESTED"
    | "ATTACK_POSITION_CHOSEN"
    | "ATTACK_TARGET_CHOSEN"
    | "CANCEL_ATTACK"
    | "DESELECT";

export interface SelectionContext {
    selectedUnitId: string | null;
    reachableTiles: Set<string>;
    /** Enemy unit IDs the attacker can hit this turn (zero-move + move+attack). */
    attackableEnemies: Set<string>;
    /** Tile keys from which the attacker can launch an attack (incl. own pos). */
    attackFromPositions: Set<string>;
    /** Tile key chosen as attack-from while in awaiting-attack-target. */
    pendingAttackFrom: string | null;
    /** Enemy unit IDs adjacent to pendingAttackFrom — the target candidates. */
    pendingTargetCandidates: Set<string>;
}

export interface SelectFriendlyPayload {
    unitId: string;
    reachable: Set<string>;
    attackable: Set<string>;
    attackFromPositions: Set<string>;
}

export interface MoveRequestedPayload {
    unitId: string;
    to: GridCoord;
}

export interface AttackPositionChosenPayload {
    attackerId: string;
    from: string;
    adjacentEnemies: Set<string>;
}

export interface AttackTargetChosenPayload {
    attackerId: string;
    targetId: string;
    from: string;
}
