import { IdleState } from "../src/fsm/selection/states/IdleState";
import type {
    SelectionContext,
    SelectionEvent,
} from "../src/fsm/selection/events";

const ALL_EVENTS: SelectionEvent[] = [
    "SELECT_FRIENDLY",
    "MOVE_REQUESTED",
    "DESELECT",
];

describe("IdleState", () => {
    const makeCtx = (): SelectionContext => ({
        selectedUnitId: null,
        reachableTiles: new Set(),
    });

    it("returns transition object for SELECT_FRIENDLY", () => {
        const state = new IdleState();
        const result = state.handle("SELECT_FRIENDLY", makeCtx(), {
            unitId: "u1",
            reachable: new Set(["1,1"]),
        });
        expect(result).not.toBeNull();
        expect(typeof result).toBe("object");
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("selected");
            expect(typeof result.action).toBe("function");
        }
    });

    it("returns null for MOVE_REQUESTED", () => {
        const state = new IdleState();
        expect(state.handle("MOVE_REQUESTED", makeCtx())).toBeNull();
    });

    it("returns null for DESELECT", () => {
        const state = new IdleState();
        expect(state.handle("DESELECT", makeCtx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new IdleState();
                expect(() =>
                    state.handle(event, makeCtx(), {
                        unitId: "u1",
                        reachable: new Set(),
                    }),
                ).not.toThrow();
            });
        }
    });
});
