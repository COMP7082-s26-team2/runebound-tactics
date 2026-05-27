/**
 * Axial grid coordinate. Used by SquareGrid (interpreted as column/row) and
 * future hex grids. Stays in the q/r namespace so server BFS and client
 * highlight code share the same vocabulary.
 */
export interface GridCoord {
    q: number;
    r: number;
}
