import { Machine } from "../Machine";
import { IdleState } from "./states/IdleState";
import { SelectedState } from "./states/SelectedState";
import type { SelectionContext, SelectionEvent } from "./events";

export type SelectionMachine = Machine<SelectionContext, SelectionEvent>;

export function createSelectionMachine(): SelectionMachine {
    return new Machine<SelectionContext, SelectionEvent>({
        initial: "idle",
        context: {
            selectedUnitId: null,
            reachableTiles: new Set(),
        },
        states: [new IdleState(), new SelectedState()],
    });
}
