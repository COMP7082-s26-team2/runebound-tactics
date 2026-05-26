/**
 * "Spent" predicate — the unit has consumed its movement allowance this turn.
 *
 * Today: `hasMoved === true`.
 *
 * Future (when action-points lands, per state_machine_shared_design_v2.1
 * anchors AP-1 / AP-2 / AP-5): `unit.actionPoints < MOVE_COST` (or `=== 0`,
 * per the AP design). This file is the ONLY place that should be touched
 * when AP arrives — reconciler and selection system both call this; they
 * must not read `hasMoved` directly.
 *
 * The parameter type is structural so both shapes work:
 *   - Live `GameUnit` from `room.state.units` (has the field plus schema metadata)
 *   - LiteUnit snapshots from the reconciler's plain-object path
 */
export function unitIsExhausted(unit: { hasMoved: boolean }): boolean {
    return unit.hasMoved;
}
