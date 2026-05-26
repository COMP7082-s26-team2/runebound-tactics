import type { GridCoord } from "../../types/grid";
import { cellKey } from "../grid-utils";

/**
 * Inputs for BFS reachability. The caller supplies a neighbor function and
 * an occupancy predicate, decoupling the pathfinder from any specific World
 * implementation. Both client and server can construct this from their own
 * data structures.
 */
export interface MovementContext {
    getNeighbors(coord: GridCoord): GridCoord[];
    isOccupied(cellKey: string): boolean;
    movement: number;
    start: GridCoord;
}

/**
 * Returns the set of grid cells (as "q,r" keys) a unit can reach by moving
 * up to `movement` orthogonal steps through unoccupied tiles.
 *
 * The start cell is NOT included in the returned set. Occupied tiles are
 * skipped (the unit cannot move onto another unit's cell).
 *
 * Pure function. Same inputs always produce the same Set.
 */
export function computeReachableTiles(ctx: MovementContext): Set<string> {
    const visited = new Map<string, number>();
    const startKey = cellKey(ctx.start);
    visited.set(startKey, 0);

    const queue: Array<{ coord: GridCoord; steps: number }> = [
        { coord: ctx.start, steps: 0 },
    ];

    while (queue.length > 0) {
        const { coord, steps } = queue.shift()!;
        if (steps >= ctx.movement) continue;

        for (const neighbor of ctx.getNeighbors(coord)) {
            const key = cellKey(neighbor);
            if (visited.has(key)) continue;
            if (ctx.isOccupied(key)) continue;
            visited.set(key, steps + 1);
            queue.push({ coord: neighbor, steps: steps + 1 });
        }
    }

    visited.delete(startKey);
    return new Set(visited.keys());
}
