import { StateBase, type TransitionResult } from "../../StateBase";
import type { SelectionContext, SelectionEvent } from "../events";

export class SelectedState extends StateBase<SelectionContext, SelectionEvent> {
    readonly name = "selected";

    handle(
        event: SelectionEvent,
        _ctx: SelectionContext,
        _payload?: unknown,
    ): TransitionResult<SelectionContext> {
        // AP: when AP system lands, MOVE_REQUESTED guard adds:
        //     if (selectedUnit.actionPoints < MOVE_COST) return null;
        // AP: deselect-on-zero-AP rule TBD by AP design.
        if (event === "MOVE_REQUESTED" || event === "DESELECT") {
            return {
                target: "idle",
                action: () => ({
                    selectedUnitId: null,
                    reachableTiles: new Set<string>(),
                }),
            };
        }
        return null;
    }
}
