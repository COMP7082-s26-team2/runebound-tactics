import { ResolvingState } from "../src/fsm/turn/states/ResolvingState";
import type { TurnContext, TurnEvent } from "../src/fsm/turn/events";

const ALL_EVENTS: TurnEvent[] = [
    "END_TURN",
    "ALL_UNITS_MOVED",
    "TURN_ADVANCED",
];

describe("ResolvingState", () => {
    const ctx = (): TurnContext => ({ currentPlayerId: "p1" });

    it("transitions to active on TURN_ADVANCED with currentPlayerId update", () => {
        const state = new ResolvingState();
        const result = state.handle("TURN_ADVANCED", ctx(), {
            playerId: "p2",
        });
        expect(result).not.toBeNull();
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("active");
            const patch = result.action?.(ctx());
            expect(patch).toEqual({ currentPlayerId: "p2" });
        }
    });

    it("returns null for END_TURN", () => {
        const state = new ResolvingState();
        expect(state.handle("END_TURN", ctx())).toBeNull();
    });

    it("returns null for ALL_UNITS_MOVED", () => {
        const state = new ResolvingState();
        expect(state.handle("ALL_UNITS_MOVED", ctx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new ResolvingState();
                expect(() =>
                    state.handle(event, ctx(), { playerId: "p2" }),
                ).not.toThrow();
            });
        }
    });
});
