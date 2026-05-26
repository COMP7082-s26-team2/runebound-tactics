import type { GridCoord } from "../../types/grid";

/**
 * Selection FSM — event union, context shape, payload types.
 *
 * idle      — no unit selected.
 * selected  — a friendly unit is selected; its reachable tiles are in context.
 */

export type SelectionState = "idle" | "selected";

export type SelectionEvent =
    | "SELECT_FRIENDLY"
    | "MOVE_REQUESTED"
    | "DESELECT";

export interface SelectionContext {
    selectedUnitId: string | null;
    reachableTiles: Set<string>;
}

export interface SelectFriendlyPayload {
    unitId: string;
    reachable: Set<string>;
}

export interface MoveRequestedPayload {
    unitId: string;
    to: GridCoord;
}
