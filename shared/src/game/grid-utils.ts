import type { GridCoord } from "../types/grid";

/**
 * Canonical "q,r" key for a grid cell. Used as Set/Map key for occupancy
 * and reachability data structures. Identical on client and server.
 */
export function cellKey(coord: GridCoord): string {
    return `${coord.q},${coord.r}`;
}

/**
 * 4-direction (orthogonal) neighbors for a square grid. Used by movement BFS.
 */
export function squareGridNeighbors({ q, r }: GridCoord): GridCoord[] {
    return [
        { q: q + 1, r },
        { q: q - 1, r },
        { q, r: r + 1 },
        { q, r: r - 1 },
    ];
}
