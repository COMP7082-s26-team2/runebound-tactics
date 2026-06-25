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
    /**
     * Phase 1 (terrain-movement-table_design_v1.3): optional terrain veto.
     * Returns false to treat the cell as impassable. Absent = treat as
     * always enterable (backward-compatible with callers that have no
     * terrain source, e.g. legacy server before TerrainGrid lands).
     */
    canEnter?(coord: GridCoord): boolean;
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
            if (ctx.canEnter && !ctx.canEnter(neighbor)) continue;
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
    /**
     * Phase 1 (terrain-movement-table_design_v1.3): optional terrain veto.
     * The goal cell bypasses this check (server already validated the goal
     * is valid; an animation must not stall because client's predicate
     * temporarily disagrees during a desync window).
     */
    canEnter?(coord: GridCoord): boolean;
    start: GridCoord;
    goal: GridCoord;
}

/**
 * Returns a shortest grid path from `start` to `goal` as `[start, ..., goal]`.
 * Path passes through unoccupied + enterable cells only. The goal itself is
 * treated as reachable even if `isOccupied`/`canEnter` would reject it (the
 * mover may have already been placed there or server has validated entry).
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
            // Goal-bypass for canEnter too — see PathfindingContext jsdoc.
            if (ctx.canEnter && !ctx.canEnter(neighbor) && key !== goalKey) continue;
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
