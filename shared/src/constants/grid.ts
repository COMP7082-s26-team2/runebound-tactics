/**
 * Grid layout constants shared across client renderer, server validation,
 * and any future BFS / pathfinding consumer.
 *
 * Single source of truth — changing CELL_SIZE here updates client visuals AND
 * server reachability semantics together.
 */
export const CELL_SIZE = 80;
export const GRID_COLS = 10;
export const GRID_ROWS = 10;
