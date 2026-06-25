import type { SelectionContext } from "../events";

/**
 * Returns a fresh empty SelectionContext patch — used by states that
 * transition back to "idle" or otherwise need to wipe selection data.
 *
 * Returned as Partial<Ctx> for the Machine's spread-merge effect path.
 */
export function clearSelectionContext(): Partial<SelectionContext> {
    return {
        selectedUnitId: null,
        reachableTiles: new Set<string>(),
        attackableEnemies: new Set<string>(),
        attackFromPositions: new Set<string>(),
        pendingAttackFrom: null,
        pendingTargetCandidates: new Set<string>(),
    };
}

/**
 * Empty initial context — used by createSelectionMachine.
 */
export function emptySelectionContext(): SelectionContext {
    return {
        selectedUnitId: null,
        reachableTiles: new Set<string>(),
        attackableEnemies: new Set<string>(),
        attackFromPositions: new Set<string>(),
        pendingAttackFrom: null,
        pendingTargetCandidates: new Set<string>(),
    };
}
