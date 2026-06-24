import type { DamageType } from "../../types/game";
import { MovementType } from "../terrain";

/**
 * Unit stats lookup — movement, combat, action points, health, and damage types.
 *
 * Used by server (reachability cache, move validation, damage formula, unit spawn)
 * and client (movement highlights, computed attack stats).
 * Keep in sync across both sides via this single shared module.
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
    "castle:swordsman": 5,
    "castle:archer": 4,
    "castle:paladin": 5,
    "castle:cavalier": 5,
    "castle:griffin": 4,
    "necropolis:skeleton": 4,
    "necropolis:death_knight": 5,
    "necropolis:vampire": 5,
    "necropolis:ghost": 4,
    "necropolis:zombie": 3,
};

const DEFAULT_ATTACK = 4;

export function getUnitAttack(unitType: UnitTypeId): number {
    return UNIT_ATTACK[unitType] ?? DEFAULT_ATTACK;
}

/**
 * Per-unit defense value. Subtracted from attacker's `attack` in the damage
 * formula; minimum damage is 1 (a hit always does something).
 */
const UNIT_DEFENSE: Record<string, number> = {
    "castle:swordsman": 2,
    "castle:archer": 1,
    "castle:paladin": 3,
    "castle:cavalier": 2,
    "castle:griffin": 1,
    "necropolis:skeleton": 1,
    "necropolis:death_knight": 3,
    "necropolis:vampire": 2,
    "necropolis:ghost": 1,
    "necropolis:zombie": 2,
};

const DEFAULT_DEFENSE = 2;

export function getUnitDefense(unitType: UnitTypeId): number {
    return UNIT_DEFENSE[unitType] ?? DEFAULT_DEFENSE;
}

const UNIT_BASE_HEALTH: Record<string, number> = {
    "castle:swordsman":        10,
    "castle:archer":           8,
    "castle:paladin":          14,
    "castle:cavalier":         10,
    "castle:griffin":          9,
    "necropolis:skeleton":     7,
    "necropolis:death_knight": 14,
    "necropolis:vampire":      10,
    "necropolis:ghost":        8,
    "necropolis:zombie":       12,
};

const DEFAULT_BASE_HEALTH = 10;

export function getUnitBaseHealth(unitType: UnitTypeId): number {
    return UNIT_BASE_HEALTH[unitType] ?? DEFAULT_BASE_HEALTH;
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

const UNIT_DAMAGE_TYPE: Record<string, DamageType> = {
    "castle:swordsman":        "melee",
    "castle:archer":           "range",
    "castle:paladin":          "melee",
    "castle:cavalier":         "cavalry",
    "castle:griffin":          "range",
    "necropolis:skeleton":     "melee",
    "necropolis:death_knight": "melee",
    "necropolis:vampire":      "melee",
    "necropolis:ghost":        "pure",
    "necropolis:zombie":       "melee",
};

const DEFAULT_WEAKNESS: Record<DamageType, DamageType[]> = {
    melee:   ["cavalry"],
    cavalry: ["range"],
    range:   ["melee"],
    pure:    [],
};

export function getUnitDamageType(unitType: UnitTypeId): DamageType | null {
    return UNIT_DAMAGE_TYPE[unitType] ?? null;
}

export function getUnitDefaultWeakness(unitType: UnitTypeId): DamageType[] {
    const dt = getUnitDamageType(unitType);
    return dt !== null ? DEFAULT_WEAKNESS[dt] : [];
}

export function getEffectiveMaxHealth(u: {
    baseMaxHealth: number;
    bonusMaxHealth: number;
}): number {
    return Math.max(0, u.baseMaxHealth + u.bonusMaxHealth);
}

export function getEffectiveAttack(u: {
    baseAttackDamage: number;
    bonusAttackDamage: number;
}): number {
    return Math.max(0, u.baseAttackDamage + u.bonusAttackDamage);
}

export function getEffectiveDefense(u: {
    baseDefense: number;
    bonusDefense: number;
}): number {
    return Math.max(0, u.baseDefense + u.bonusDefense);
}

export function getEffectiveMovement(u: {
    baseMovement: number;
    bonusMovement: number;
}): number {
    return Math.max(0, u.baseMovement + u.bonusMovement);
}

export function getEffectiveAp(u: {
    baseAp: number;
    bonusAp: number;
}): number {
    return Math.max(0, u.baseAp + u.bonusAp);
}

export const WEAKNESS_MULTIPLIER = 1.5;

/**
 * Server-authoritative damage formula. Branches on attacker damageType:
 *   pure   → effectiveAttack (bypasses defense, no weakness)
 *   ""     → max(1, effectiveAttack − effectiveDefense) (no weakness)
 *   other  → max(1, floor(effectiveAttack × multiplier) − effectiveDefense)
 *             where multiplier = WEAKNESS_MULTIPLIER if attacker type is in defender.weakness, else 1
 */
export function computeAttackDamage(
    attacker: { baseAttackDamage: number; bonusAttackDamage: number; damageType: string },
    defender: { baseDefense: number; bonusDefense: number; weakness: readonly string[] },
): number {
    const effectiveAttack = getEffectiveAttack(attacker);
    const effectiveDefense = getEffectiveDefense(defender);

    if (attacker.damageType === "pure") {
        return effectiveAttack;
    }

    if (!attacker.damageType) {
        return Math.max(1, effectiveAttack - effectiveDefense);
    }

    const multiplier = defender.weakness.includes(attacker.damageType)
        ? WEAKNESS_MULTIPLIER
        : 1;
    return Math.max(1, Math.floor(effectiveAttack * multiplier) - effectiveDefense);
}

const UNIT_MOVEMENT_TYPE: Record<string, MovementType> = {
    "castle:swordsman":        MovementType.Infantry,
    "castle:archer":           MovementType.Infantry,
    "castle:paladin":          MovementType.Infantry,
    "castle:cavalier":         MovementType.Infantry,
    "castle:griffin":          MovementType.Infantry,
    "necropolis:skeleton":     MovementType.Infantry,
    "necropolis:death_knight": MovementType.Infantry,
    "necropolis:vampire":      MovementType.Infantry,
    "necropolis:ghost":        MovementType.Infantry,
    "necropolis:zombie":       MovementType.Infantry,
};

const DEFAULT_MOVEMENT_TYPE: MovementType = MovementType.Infantry;

/**
 * Per-unit locomotion category. Drives terrain walkability + (Phase 2) cost.
 * Mirrors getUnitMovement/getUnitAttack pattern. New unit types added here.
 */
export function getUnitMovementType(unitType: UnitTypeId): MovementType {
    return UNIT_MOVEMENT_TYPE[unitType] ?? DEFAULT_MOVEMENT_TYPE;
}
