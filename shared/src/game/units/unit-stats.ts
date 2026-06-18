/**
 * Minimal unit stats lookup — movement + combat (v1).
 *
 * Used by server (for reachability cache + move validation + damage formula)
 * and client (when displaying movement highlights + computed attack stats).
 * Keep in sync across both sides via this single shared module.
 *
 * When the full UnitStats system lands, this file is the seed for the
 * canonical table — extend the record types and add any new helpers here.
 */

export type UnitTypeId = string;

const UNIT_MOVEMENT: Record<string, number> = {
    "castle:swordsman": 3,
    "castle:archer": 3,
    "castle:paladin": 4,
    "castle:cavalier": 5,
    "castle:griffin": 5,
    "necropolis:skeleton": 3,
    "necropolis:death_knight": 3,
    "necropolis:vampire": 4,
    "necropolis:ghost": 4,
    "necropolis:zombie": 2,
};

const DEFAULT_MOVEMENT = 3;

export function getUnitMovement(unitType: UnitTypeId): number {
    return UNIT_MOVEMENT[unitType] ?? DEFAULT_MOVEMENT;
}

/**
 * Per-unit attack value. Used by `CombatSystem.resolveAttack` formula:
 *   damage = max(1, attacker.attack - defender.defense)
 *
 * v1: flat values per unit type. When per-stat balancing arrives, extend
 * the records below and (optionally) replace the lookup with a richer
 * UnitStats object.
 */
const UNIT_ATTACK: Record<string, number> = {
    "castle:swordsman": 6,
    "castle:archer": 5,
    "castle:paladin": 7,
    "castle:cavalier": 6,
    "castle:griffin": 5,
    "necropolis:skeleton": 4,
    "necropolis:death_knight": 7,
    "necropolis:vampire": 6,
    "necropolis:ghost": 5,
    "necropolis:zombie": 3,
};

const DEFAULT_ATTACK = 5;

export function getUnitAttack(unitType: UnitTypeId): number {
    return UNIT_ATTACK[unitType] ?? DEFAULT_ATTACK;
}

/**
 * Per-unit defense value. Subtracted from attacker's `attack` in the damage
 * formula; minimum damage is 1 (a hit always does something).
 */
const UNIT_DEFENSE: Record<string, number> = {
    "castle:swordsman": 3,
    "castle:archer": 2,
    "castle:paladin": 5,
    "castle:cavalier": 3,
    "castle:griffin": 2,
    "necropolis:skeleton": 2,
    "necropolis:death_knight": 4,
    "necropolis:vampire": 3,
    "necropolis:ghost": 2,
    "necropolis:zombie": 4,
};

const DEFAULT_DEFENSE = 3;

export function getUnitDefense(unitType: UnitTypeId): number {
    return UNIT_DEFENSE[unitType] ?? DEFAULT_DEFENSE;
}

const UNIT_BASE_AP: Record<string, number> = {
    "castle:swordsman":        2,
    "castle:archer":           2,
    "castle:paladin":          2,
    "castle:cavalier":         2,
    "castle:griffin":          2,
    "necropolis:skeleton":     2,
    "necropolis:death_knight": 2,
    "necropolis:vampire":      2,
    "necropolis:ghost":        2,
    "necropolis:zombie":       2,
};

const DEFAULT_BASE_AP = 2;

export function getUnitBaseAp(unitType: UnitTypeId): number {
    return UNIT_BASE_AP[unitType] ?? DEFAULT_BASE_AP;
}

/**
 * Server-authoritative damage formula. Pure — same inputs always produce
 * the same output, with a minimum of 1 damage per hit (so attacks always
 * have some effect; balancing of "0-damage" cases is a future design).
 */
export function computeAttackDamage(
    attackerType: UnitTypeId,
    defenderType: UnitTypeId,
): number {
    const atk = getUnitAttack(attackerType);
    const def = getUnitDefense(defenderType);
    return Math.max(1, atk - def);
}
