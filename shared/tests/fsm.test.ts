import { StateMachine } from "../src/fsm/fsm";

describe("StateMachine", () => {
    type TrafficState = "red" | "green" | "yellow";
    type TrafficEvent = "NEXT" | "STOP";
    interface TrafficContext {
        cycles: number;
    }

    const makeTrafficMachine = () =>
        new StateMachine<TrafficContext, TrafficState, TrafficEvent>({
            initial: "red",
            context: { cycles: 0 },
            states: {
                red: { on: { NEXT: "green" } },
                green: { on: { NEXT: "yellow" } },
                yellow: {
                    on: {
                        NEXT: {
                            target: "red",
                            action: (ctx) => ({ cycles: ctx.cycles + 1 }),
                        },
                    },
                },
            },
        });

    it("starts in the configured initial state", () => {
        const m = makeTrafficMachine();
        expect(m.state).toBe("red");
        expect(m.context.cycles).toBe(0);
    });

    it("transitions on a known event", () => {
        const m = makeTrafficMachine();
        m.send("NEXT");
        expect(m.state).toBe("green");
    });

    it("silently ignores events not defined on the current state", () => {
        const m = makeTrafficMachine();
        m.send("STOP");
        expect(m.state).toBe("red");
    });

    it("runs the transition action and merges its return into context", () => {
        const m = makeTrafficMachine();
        m.send("NEXT"); // red → green
        m.send("NEXT"); // green → yellow
        m.send("NEXT"); // yellow → red (action increments cycles)
        expect(m.state).toBe("red");
        expect(m.context.cycles).toBe(1);
    });

    it("respects a guard that returns false", () => {
        type S = "a" | "b";
        type E = "GO";
        const m = new StateMachine<{ allow: boolean }, S, E>({
            initial: "a",
            context: { allow: false },
            states: {
                a: {
                    on: {
                        GO: {
                            target: "b",
                            guard: (ctx) => ctx.allow,
                        },
                    },
                },
                b: {},
            },
        });
        m.send("GO");
        expect(m.state).toBe("a");
    });

    it("calls onEntry of the initial state on construction", () => {
        const calls: string[] = [];
        new StateMachine<{ tag: string }, "a", "X">({
            initial: "a",
            context: { tag: "start" },
            states: {
                a: {
                    onEntry: (ctx) => {
                        calls.push(`a-enter:${ctx.tag}`);
                    },
                },
            },
        });
        expect(calls).toEqual(["a-enter:start"]);
    });

    it("fires onExit → action → onEntry in that order", () => {
        const calls: string[] = [];
        const m = new StateMachine<{ tag: string }, "a" | "b", "GO">({
            initial: "a",
            context: { tag: "" },
            states: {
                a: {
                    onEntry: () => {
                        calls.push("a-enter");
                    },
                    onExit: () => {
                        calls.push("a-exit");
                    },
                    on: {
                        GO: {
                            target: "b",
                            action: () => {
                                calls.push("action");
                            },
                        },
                    },
                },
                b: {
                    onEntry: () => {
                        calls.push("b-enter");
                    },
                },
            },
        });
        // a-enter fired in constructor
        m.send("GO");
        expect(calls).toEqual(["a-enter", "a-exit", "action", "b-enter"]);
    });

    it("notifies subscribers on each transition and on subscribe()", () => {
        const m = makeTrafficMachine();
        const states: TrafficState[] = [];
        const unsub = m.subscribe((s) => states.push(s));
        // subscribe fires once immediately
        expect(states).toEqual(["red"]);
        m.send("NEXT");
        m.send("NEXT");
        expect(states).toEqual(["red", "green", "yellow"]);
        unsub();
        m.send("NEXT");
        expect(states).toEqual(["red", "green", "yellow"]);
    });

    it("supports string-form transitions (no guard, no action)", () => {
        const m = makeTrafficMachine();
        m.send("NEXT");
        expect(m.state).toBe("green");
        m.send("NEXT");
        expect(m.state).toBe("yellow");
    });
});
