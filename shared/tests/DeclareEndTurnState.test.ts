import { DeclareEndTurnState } from "../src/fsm/turn/states/DeclareEndTurnState";
import type { TurnContext, TurnEvent } from "../src/fsm/turn/events";

const ALL_EVENTS: TurnEvent[] = [
    "END_TURN",
    "ALL_UNITS_MOVED",
    "ATTACK_DECLARED",
    "QUICK_PLAY_RESOLVED",
    "COMBAT_RESOLVED",
    "POST_COMBAT_RESOLVED",
    "TURN_ADVANCED",
];

describe("DeclareEndTurnState", () => {
    const ctx = (): TurnContext => ({ currentPlayerId: "p1" });

    it("transitions to action-phase on TURN_ADVANCED with currentPlayerId update", () => {
        const state = new DeclareEndTurnState();
        const result = state.handle("TURN_ADVANCED", ctx(), { playerId: "p2" });
        expect(result).not.toBeNull();
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("action-phase");
            const patch = result.action?.(ctx());
            expect(patch).toEqual({ currentPlayerId: "p2" });
        }
    });

    it("returns null for END_TURN", () => {
        const state = new DeclareEndTurnState();
        expect(state.handle("END_TURN", ctx())).toBeNull();
    });

    it("returns null for ALL_UNITS_MOVED", () => {
        const state = new DeclareEndTurnState();
        expect(state.handle("ALL_UNITS_MOVED", ctx())).toBeNull();
    });

    it("returns null for ATTACK_DECLARED", () => {
        const state = new DeclareEndTurnState();
        expect(state.handle("ATTACK_DECLARED", ctx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new DeclareEndTurnState();
                expect(() =>
                    state.handle(event, ctx(), { playerId: "p2" }),
                ).not.toThrow();
            });
        }
    });
});
