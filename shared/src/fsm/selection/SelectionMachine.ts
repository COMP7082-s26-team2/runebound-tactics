import { Machine } from "../Machine";
import { IdleState } from "./states/IdleState";
import { SelectedState } from "./states/SelectedState";
import { AwaitingAttackTargetState } from "./states/AwaitingAttackTargetState";
import { emptySelectionContext } from "./states/_helpers";
import type { SelectionContext, SelectionEvent } from "./events";

export type SelectionMachine = Machine<SelectionContext, SelectionEvent>;

export function createSelectionMachine(): SelectionMachine {
    return new Machine<SelectionContext, SelectionEvent>({
        initial: "idle",
        context: emptySelectionContext(),
        states: [
            new IdleState(),
            new SelectedState(),
            new AwaitingAttackTargetState(),
        ],
    });
}
