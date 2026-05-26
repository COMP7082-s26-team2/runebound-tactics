import { createTurnMachine } from "../src/fsm/turn/TurnMachine";

describe("turnMachine", () => {
    it("starts in active with the initial player id", () => {
        const m = createTurnMachine("p1");
        expect(m.state).toBe("active");
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("active → resolving on END_TURN", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        expect(m.state).toBe("resolving");
        // currentPlayerId not yet updated — host-side work happens between
        // resolving entry and TURN_ADVANCED.
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("active → resolving on ALL_UNITS_MOVED", () => {
        const m = createTurnMachine("p1");
        m.send("ALL_UNITS_MOVED");
        expect(m.state).toBe("resolving");
    });

    it("resolving → active on TURN_ADVANCED with new player id", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        m.send("TURN_ADVANCED", { playerId: "p2" });
        expect(m.state).toBe("active");
        expect(m.context.currentPlayerId).toBe("p2");
    });

    it("ignores TURN_ADVANCED while active", () => {
        const m = createTurnMachine("p1");
        m.send("TURN_ADVANCED", { playerId: "p2" });
        expect(m.state).toBe("active");
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("ignores END_TURN / ALL_UNITS_MOVED while resolving", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        m.send("END_TURN");
        m.send("ALL_UNITS_MOVED");
        expect(m.state).toBe("resolving");
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
            { state: "active", player: "p1" },
            { state: "resolving", player: "p1" },
            { state: "active", player: "p2" },
        ]);
    });
});
