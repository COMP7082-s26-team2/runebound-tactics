/**
 * Minimal unit stats lookup — movement range only.
 *
 * Used by server (for reachability cache + move validation) and client
 * (when displaying movement highlights). Keep in sync across both sides.
 *
 * When the full UnitStats system lands (combat, defense, attack range),
 * this file is the seed for the canonical table — extend the record type.
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
