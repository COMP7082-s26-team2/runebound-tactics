import { ActiveState } from "../src/fsm/turn/states/ActiveState";
import type { TurnContext, TurnEvent } from "../src/fsm/turn/events";

const ALL_EVENTS: TurnEvent[] = [
    "END_TURN",
    "ALL_UNITS_MOVED",
    "TURN_ADVANCED",
];

describe("ActiveState", () => {
    const ctx = (): TurnContext => ({ currentPlayerId: "p1" });

    it("transitions to resolving on END_TURN", () => {
        const state = new ActiveState();
        expect(state.handle("END_TURN", ctx())).toBe("resolving");
    });

    it("transitions to resolving on ALL_UNITS_MOVED", () => {
        const state = new ActiveState();
        expect(state.handle("ALL_UNITS_MOVED", ctx())).toBe("resolving");
    });

    it("returns null for TURN_ADVANCED (only valid in resolving)", () => {
        const state = new ActiveState();
        expect(state.handle("TURN_ADVANCED", ctx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new ActiveState();
                expect(() =>
                    state.handle(event, ctx(), { playerId: "p2" }),
                ).not.toThrow();
            });
        }
    });
});
