import type { GridCoord } from "../../types/grid";
import { cellKey } from "../grid-utils";

/**
 * Inputs for attack-target computation. Caller supplies adjacency primitives
 * decoupled from any specific World implementation, matching MovementLogic's
 * structural-context convention. Both client and server can construct this
 * from their own data structures.
 *
 * All unit identifiers are server-side string IDs (`unitId`). Owners are
 * sessionId strings; ownership equality determines friendly vs hostile.
 */
export interface AttackTargetingContext {
    /** 4-direction neighbors of a grid cell. */
    getNeighbors(coord: GridCoord): GridCoord[];
    /** Unit occupying the cell, or undefined if empty. Cell key is "q,r". */
    getOccupant(cellKey: string): string | undefined;
    /** Owner sessionId of a unit, or undefined if unit missing / unowned. */
    getOwner(unitId: string): string | undefined;
    /** Grid position of a unit, or undefined if unit missing. */
    getPosition(unitId: string): GridCoord | undefined;
}

/**
 * Enemies (different owner) occupying any of the four neighbor cells of
 * `fromCoord`. Returns their unit IDs.
 *
 * Excludes friendlies, the attacker itself, and unowned units. Returns an
 * empty Set if the attacker has no owner.
 *
 * Pure. Same code path on client (preview) and server (validation cache).
 */
export function getAdjacentEnemies(
    ctx: AttackTargetingContext,
    attackerId: string,
    fromCoord: GridCoord,
): Set<string> {
    const atkOwner = ctx.getOwner(attackerId);
    if (atkOwner === undefined) return new Set();

    const result = new Set<string>();
    for (const neighbor of ctx.getNeighbors(fromCoord)) {
        const occupant = ctx.getOccupant(cellKey(neighbor));
        if (occupant === undefined || occupant === attackerId) continue;
        const occOwner = ctx.getOwner(occupant);
        if (occOwner === undefined || occOwner === atkOwner) continue;
        result.add(occupant);
    }
    return result;
}

/**
 * All enemies the attacker can hit this turn — adjacent to current position
 * (zero-move case) OR adjacent to any tile in `reachableTiles` (move+attack).
 *
 * `reachableTiles` is the output of `MovementLogic.computeReachableTiles` —
 * a Set of "q,r" cell keys (excluding the start cell).
 */
export function computeAttackableEnemies(
    ctx: AttackTargetingContext,
    attackerId: string,
    reachableTiles: Set<string>,
): Set<string> {
    const result = new Set<string>();
    const pos = ctx.getPosition(attackerId);
    if (!pos) return result;

    for (const e of getAdjacentEnemies(ctx, attackerId, pos)) result.add(e);

    for (const key of reachableTiles) {
        const coord = coordFromKey(key);
        if (!coord) continue;
        for (const e of getAdjacentEnemies(ctx, attackerId, coord)) result.add(e);
    }

    return result;
}

/**
 * For each attackable enemy, the set of tile keys from which the attack
 * could launch. Includes the attacker's current position when that position
 * is adjacent to the enemy (the zero-move case).
 *
 * Used by the UI to render attack-from highlights and by the server to
 * validate `moveTo` against a chosen target.
 */
export function computeAttackFromPositionsByEnemy(
    ctx: AttackTargetingContext,
    attackerId: string,
    reachableTiles: Set<string>,
): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    const pos = ctx.getPosition(attackerId);
    if (!pos) return result;

    const positions = new Set<string>(reachableTiles);
    positions.add(cellKey(pos));

    for (const tileKey of positions) {
        const coord = coordFromKey(tileKey);
        if (!coord) continue;
        for (const enemy of getAdjacentEnemies(ctx, attackerId, coord)) {
            let set = result.get(enemy);
            if (!set) {
                set = new Set();
                result.set(enemy, set);
            }
            set.add(tileKey);
        }
    }

    return result;
}

function coordFromKey(key: string): GridCoord | null {
    const [qStr, rStr] = key.split(",");
    const q = Number(qStr);
    const r = Number(rStr);
    if (Number.isNaN(q) || Number.isNaN(r)) return null;
    return { q, r };
}
