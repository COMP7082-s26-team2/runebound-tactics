import { StateMachine } from "../fsm";
import type { GridCoord } from "../../types/grid";

/**
 * Client-only unit-selection FSM.
 *
 * idle      — no unit selected.
 * selected  — a friendly unit is selected; its reachable tiles are in context.
 *
 * Lives in shared/ so a future server-side AI or replay validator can reuse it,
 * but in v1.x only the client instantiates it. The server validates moves against
 * its own reachability cache, not this machine.
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

export type SelectionMachine = StateMachine<
    SelectionContext,
    SelectionState,
    SelectionEvent
>;

export function createSelectionMachine(): SelectionMachine {
    return new StateMachine<SelectionContext, SelectionState, SelectionEvent>({
        initial: "idle",
        context: {
            selectedUnitId: null,
            reachableTiles: new Set(),
        },
        states: {
            idle: {
                on: {
                    SELECT_FRIENDLY: {
                        target: "selected",
                        action: (_ctx, payload) => {
                            const p = payload as SelectFriendlyPayload;
                            return {
                                selectedUnitId: p.unitId,
                                reachableTiles: p.reachable,
                            };
                        },
                    },
                },
            },
            selected: {
                on: {
                    MOVE_REQUESTED: {
                        target: "idle",
                        action: () => ({
                            selectedUnitId: null,
                            reachableTiles: new Set<string>(),
                        }),
                    },
                    DESELECT: {
                        target: "idle",
                        action: () => ({
                            selectedUnitId: null,
                            reachableTiles: new Set<string>(),
                        }),
                    },
                },
            },
        },
    });
}
