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

/**
 * Pathfinding context for shortest-path BFS. Like MovementContext but
 * without a `movement` budget — caller is responsible for ensuring the
 * goal is actually reachable (typically because the server validated the
 * move). The `isOccupied` predicate should return false for `start` (the
 * mover's own cell, treated as free for path purposes).
 */
export interface PathfindingContext {
    getNeighbors(coord: GridCoord): GridCoord[];
    isOccupied(cellKey: string): boolean;
    start: GridCoord;
    goal: GridCoord;
}

/**
 * Returns a shortest grid path from `start` to `goal` as `[start, ..., goal]`.
 * Path passes through unoccupied cells only (`isOccupied` predicate gates
 * intermediate cells). The goal itself is treated as reachable even if
 * `isOccupied` reports true (the mover may have already been placed there).
 *
 * If no path exists, returns `[start, goal]` as a straight-line fallback
 * so the renderer still tweens to the destination instead of stalling.
 * Used by client tween-sequencing for path-following walk animations.
 */
export function computeShortestPath(ctx: PathfindingContext): GridCoord[] {
    const startKey = cellKey(ctx.start);
    const goalKey = cellKey(ctx.goal);

    if (startKey === goalKey) return [ctx.start];

    const parent = new Map<string, GridCoord | null>();
    parent.set(startKey, null);

    const queue: GridCoord[] = [ctx.start];
    let found = false;

    outer: while (queue.length > 0) {
        const coord = queue.shift()!;
        for (const neighbor of ctx.getNeighbors(coord)) {
            const key = cellKey(neighbor);
            if (parent.has(key)) continue;
            // Allow goal even if "occupied" (mover's destination).
            if (ctx.isOccupied(key) && key !== goalKey) continue;
            parent.set(key, coord);
            if (key === goalKey) {
                found = true;
                break outer;
            }
            queue.push(neighbor);
        }
    }

    if (!found) return [ctx.start, ctx.goal];

    const path: GridCoord[] = [];
    let cur: GridCoord | null | undefined = ctx.goal;
    while (cur != null) {
        path.unshift(cur);
        cur = parent.get(cellKey(cur));
    }
    return path;
}
