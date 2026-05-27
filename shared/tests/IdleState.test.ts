import { IdleState } from "../src/fsm/selection/states/IdleState";
import type {
    SelectionContext,
    SelectionEvent,
    SelectFriendlyPayload,
} from "../src/fsm/selection/events";
import { emptySelectionContext } from "../src/fsm/selection/states/_helpers";

const ALL_EVENTS: SelectionEvent[] = [
    "SELECT_FRIENDLY",
    "MOVE_REQUESTED",
    "ATTACK_POSITION_CHOSEN",
    "ATTACK_TARGET_CHOSEN",
    "CANCEL_ATTACK",
    "DESELECT",
];

const makeSelectFriendlyPayload = (): SelectFriendlyPayload => ({
    unitId: "u1",
    reachable: new Set(["1,1"]),
    attackable: new Set(),
    attackFromPositions: new Set(),
});

describe("IdleState", () => {
    const makeCtx = (): SelectionContext => emptySelectionContext();

    it("returns transition object for SELECT_FRIENDLY", () => {
        const state = new IdleState();
        const result = state.handle(
            "SELECT_FRIENDLY",
            makeCtx(),
            makeSelectFriendlyPayload(),
        );
        expect(result).not.toBeNull();
        expect(typeof result).toBe("object");
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("selected");
            expect(typeof result.action).toBe("function");
        }
    });

    it("populates the context fields from the SELECT_FRIENDLY payload", () => {
        const state = new IdleState();
        const payload: SelectFriendlyPayload = {
            unitId: "u1",
            reachable: new Set(["1,1", "1,2"]),
            attackable: new Set(["e1"]),
            attackFromPositions: new Set(["1,1"]),
        };
        const result = state.handle("SELECT_FRIENDLY", makeCtx(), payload);
        if (result && typeof result === "object" && "target" in result) {
            const patch = result.action?.(makeCtx());
            expect(patch).toMatchObject({
                selectedUnitId: "u1",
                attackableEnemies: new Set(["e1"]),
                attackFromPositions: new Set(["1,1"]),
                pendingAttackFrom: null,
            });
        }
    });

    it("returns null for non-SELECT_FRIENDLY events", () => {
        const state = new IdleState();
        expect(state.handle("MOVE_REQUESTED", makeCtx())).toBeNull();
        expect(state.handle("DESELECT", makeCtx())).toBeNull();
        expect(state.handle("ATTACK_POSITION_CHOSEN", makeCtx())).toBeNull();
        expect(state.handle("ATTACK_TARGET_CHOSEN", makeCtx())).toBeNull();
        expect(state.handle("CANCEL_ATTACK", makeCtx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new IdleState();
                expect(() =>
                    state.handle(event, makeCtx(), makeSelectFriendlyPayload()),
                ).not.toThrow();
            });
        }
    });
});
