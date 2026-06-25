import { ActionPhaseState } from "../src/fsm/turn/states/ActionPhaseState";
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

describe("ActionPhaseState", () => {
    const ctx = (): TurnContext => ({ currentPlayerId: "p1" });

    it("transitions to declare-end-turn on END_TURN", () => {
        const state = new ActionPhaseState();
        expect(state.handle("END_TURN", ctx())).toBe("declare-end-turn");
    });

    it("transitions to declare-end-turn on ALL_UNITS_MOVED", () => {
        const state = new ActionPhaseState();
        expect(state.handle("ALL_UNITS_MOVED", ctx())).toBe("declare-end-turn");
    });

    it("transitions to quick-play on ATTACK_DECLARED", () => {
        const state = new ActionPhaseState();
        expect(state.handle("ATTACK_DECLARED", ctx())).toBe("quick-play");
    });

    it("returns null for TURN_ADVANCED", () => {
        const state = new ActionPhaseState();
        expect(state.handle("TURN_ADVANCED", ctx())).toBeNull();
    });

    it("returns null for QUICK_PLAY_RESOLVED", () => {
        const state = new ActionPhaseState();
        expect(state.handle("QUICK_PLAY_RESOLVED", ctx())).toBeNull();
    });

    it("returns null for COMBAT_RESOLVED", () => {
        const state = new ActionPhaseState();
        expect(state.handle("COMBAT_RESOLVED", ctx())).toBeNull();
    });

    it("returns null for POST_COMBAT_RESOLVED", () => {
        const state = new ActionPhaseState();
        expect(state.handle("POST_COMBAT_RESOLVED", ctx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new ActionPhaseState();
                expect(() =>
                    state.handle(event, ctx(), { playerId: "p2" }),
                ).not.toThrow();
            });
        }
    });
});
