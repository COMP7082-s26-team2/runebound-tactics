import { createTurnMachine } from "../src/fsm/turn/TurnMachine";

describe("turnMachine", () => {
    it("starts in action-phase with the initial player id", () => {
        const m = createTurnMachine("p1");
        expect(m.state).toBe("action-phase");
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("action-phase → declare-end-turn on END_TURN", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        expect(m.state).toBe("declare-end-turn");
        // currentPlayerId not yet updated — host-side work happens between
        // declare-end-turn entry and TURN_ADVANCED.
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("action-phase → declare-end-turn on ALL_UNITS_MOVED", () => {
        const m = createTurnMachine("p1");
        m.send("ALL_UNITS_MOVED");
        expect(m.state).toBe("declare-end-turn");
    });

    it("action-phase → quick-play on ATTACK_DECLARED", () => {
        const m = createTurnMachine("p1");
        m.send("ATTACK_DECLARED");
        expect(m.state).toBe("quick-play");
    });

    it("quick-play → combat on QUICK_PLAY_RESOLVED", () => {
        const m = createTurnMachine("p1");
        m.send("ATTACK_DECLARED");
        m.send("QUICK_PLAY_RESOLVED");
        expect(m.state).toBe("combat");
    });

    it("combat → post-combat on COMBAT_RESOLVED", () => {
        const m = createTurnMachine("p1");
        m.send("ATTACK_DECLARED");
        m.send("QUICK_PLAY_RESOLVED");
        m.send("COMBAT_RESOLVED");
        expect(m.state).toBe("post-combat");
    });

    it("post-combat → action-phase on POST_COMBAT_RESOLVED", () => {
        const m = createTurnMachine("p1");
        m.send("ATTACK_DECLARED");
        m.send("QUICK_PLAY_RESOLVED");
        m.send("COMBAT_RESOLVED");
        m.send("POST_COMBAT_RESOLVED");
        expect(m.state).toBe("action-phase");
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("declare-end-turn → action-phase on TURN_ADVANCED with new player id", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        m.send("TURN_ADVANCED", { playerId: "p2" });
        expect(m.state).toBe("action-phase");
        expect(m.context.currentPlayerId).toBe("p2");
    });

    it("ignores TURN_ADVANCED while in action-phase", () => {
        const m = createTurnMachine("p1");
        m.send("TURN_ADVANCED", { playerId: "p2" });
        expect(m.state).toBe("action-phase");
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("ignores END_TURN / ALL_UNITS_MOVED while in declare-end-turn", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        m.send("END_TURN");
        m.send("ALL_UNITS_MOVED");
        expect(m.state).toBe("declare-end-turn");
    });

    it("ignores ATTACK_DECLARED while in declare-end-turn", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        m.send("ATTACK_DECLARED");
        expect(m.state).toBe("declare-end-turn");
    });

    it("notifies subscribers on each transition and on subscribe()", () => {
        const m = createTurnMachine("p1");
        const trace: Array<{ state: string; player: string }> = [];
        m.subscribe((state, ctx) =>
            trace.push({ state, player: ctx.currentPlayerId }),
        );
        m.send("END_TURN");
        m.send("TURN_ADVANCED", { playerId: "p2" });
        expect(trace).toEqual([
            { state: "action-phase", player: "p1" },
            { state: "declare-end-turn", player: "p1" },
            { state: "action-phase", player: "p2" },
        ]);
    });

    it("attack pipeline: subscriber notified for all 4 phases", () => {
        const m = createTurnMachine("p1");
        const states: string[] = [];
        m.subscribe((state) => states.push(state));
        m.send("ATTACK_DECLARED");
        m.send("QUICK_PLAY_RESOLVED");
        m.send("COMBAT_RESOLVED");
        m.send("POST_COMBAT_RESOLVED");
        expect(states).toEqual([
            "action-phase",
            "quick-play",
            "combat",
            "post-combat",
            "action-phase",
        ]);
    });
});
