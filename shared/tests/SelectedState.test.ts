import { SelectedState } from "../src/fsm/selection/states/SelectedState";
import type {
    SelectionContext,
    SelectionEvent,
} from "../src/fsm/selection/events";

const ALL_EVENTS: SelectionEvent[] = [
    "SELECT_FRIENDLY",
    "MOVE_REQUESTED",
    "DESELECT",
];

describe("SelectedState", () => {
    const makeCtx = (): SelectionContext => ({
        selectedUnitId: "u1",
        reachableTiles: new Set(["1,1", "1,2"]),
    });

    it("returns transition to idle on MOVE_REQUESTED with context-clearing action", () => {
        const state = new SelectedState();
        const result = state.handle("MOVE_REQUESTED", makeCtx());
        expect(result).not.toBeNull();
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("idle");
            const patch = result.action?.(makeCtx());
            expect(patch).toMatchObject({
                selectedUnitId: null,
            });
        }
    });

    it("returns transition to idle on DESELECT", () => {
        const state = new SelectedState();
        const result = state.handle("DESELECT", makeCtx());
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("idle");
        }
    });

    it("returns null for SELECT_FRIENDLY (no re-select while selected)", () => {
        const state = new SelectedState();
        expect(state.handle("SELECT_FRIENDLY", makeCtx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new SelectedState();
                expect(() => state.handle(event, makeCtx())).not.toThrow();
            });
        }
    });
});
