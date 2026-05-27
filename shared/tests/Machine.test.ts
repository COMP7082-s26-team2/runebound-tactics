import { Machine } from "../src/fsm/Machine";
import { StateBase, type TransitionResult } from "../src/fsm/StateBase";

type LightState = "red" | "green" | "yellow";
type LightEvent = "NEXT" | "STOP";
interface LightCtx {
    cycles: number;
}

class RedState extends StateBase<LightCtx, LightEvent> {
    readonly name = "red";
    handle(event: LightEvent): TransitionResult<LightCtx> {
        if (event === "NEXT") return "green";
        return null;
    }
}

class GreenState extends StateBase<LightCtx, LightEvent> {
    readonly name = "green";
    handle(event: LightEvent): TransitionResult<LightCtx> {
        if (event === "NEXT") return "yellow";
        return null;
    }
}

class YellowState extends StateBase<LightCtx, LightEvent> {
    readonly name = "yellow";
    handle(event: LightEvent): TransitionResult<LightCtx> {
        if (event === "NEXT") {
            return {
                target: "red",
                action: (ctx) => ({ cycles: ctx.cycles + 1 }),
            };
        }
        return null;
    }
}

const makeLight = () =>
    new Machine<LightCtx, LightEvent>({
        initial: "red",
        context: { cycles: 0 },
        states: [new RedState(), new GreenState(), new YellowState()],
    });

describe("Machine", () => {
    it("starts in the configured initial state", () => {
        const m = makeLight();
        expect(m.state).toBe("red");
        expect(m.context.cycles).toBe(0);
    });

    it("throws when initial state is not registered", () => {
        expect(
            () =>
                new Machine<LightCtx, LightEvent>({
                    initial: "purple",
                    context: { cycles: 0 },
                    states: [new RedState()],
                }),
        ).toThrow(/Initial state "purple" not registered/);
    });

    it("transitions on a known event", () => {
        const m = makeLight();
        m.send("NEXT");
        expect(m.state).toBe("green");
    });

    it("silently ignores events the current state does not handle", () => {
        const m = makeLight();
        m.send("STOP");
        expect(m.state).toBe("red");
    });

    it("silently ignores transitions to unknown target names", () => {
        type S = "a";
        type E = "GO";
        class A extends StateBase<{}, E> {
            readonly name = "a";
            handle(): TransitionResult<{}> {
                return "nowhere";
            }
        }
        const m = new Machine<{}, E>({
            initial: "a",
            context: {},
            states: [new A()],
        });
        m.send("GO");
        expect(m.state).toBe("a");
    });

    it("runs the transition action and merges its return into context", () => {
        const m = makeLight();
        m.send("NEXT"); // red → green
        m.send("NEXT"); // green → yellow
        m.send("NEXT"); // yellow → red, action increments
        expect(m.state).toBe("red");
        expect(m.context.cycles).toBe(1);
    });

    it("fires onExit → action → state change → onEntry → notify", () => {
        const calls: string[] = [];

        class A extends StateBase<{ tag: string }, "GO"> {
            readonly name = "a";
            onEntry() {
                calls.push("a-enter");
            }
            onExit() {
                calls.push("a-exit");
            }
            handle(event: "GO"): TransitionResult<{ tag: string }> {
                if (event === "GO") {
                    return {
                        target: "b",
                        action: () => {
                            calls.push("action");
                        },
                    };
                }
                return null;
            }
        }

        class B extends StateBase<{ tag: string }, "GO"> {
            readonly name = "b";
            onEntry() {
                calls.push("b-enter");
            }
            handle(): TransitionResult<{ tag: string }> {
                return null;
            }
        }

        const m = new Machine<{ tag: string }, "GO">({
            initial: "a",
            context: { tag: "" },
            states: [new A(), new B()],
        });
        m.subscribe(() => calls.push("notify"));
        // subscribe fires the listener immediately
        // a-enter from constructor, notify from subscribe
        m.send("GO");
        expect(calls).toEqual([
            "a-enter",
            "notify",
            "a-exit",
            "action",
            "b-enter",
            "notify",
        ]);
    });

    it("supports self-loop: action fires, listeners notified, no enter/exit", () => {
        const calls: string[] = [];

        class A extends StateBase<{ n: number }, "TICK"> {
            readonly name = "a";
            onEntry() {
                calls.push("a-enter");
            }
            onExit() {
                calls.push("a-exit");
            }
            handle(event: "TICK"): TransitionResult<{ n: number }> {
                if (event === "TICK") {
                    return {
                        target: "a",
                        action: (ctx) => ({ n: ctx.n + 1 }),
                    };
                }
                return null;
            }
        }

        const m = new Machine<{ n: number }, "TICK">({
            initial: "a",
            context: { n: 0 },
            states: [new A()],
        });
        m.subscribe(() => calls.push(`notify:${m.context.n}`));
        m.send("TICK");
        m.send("TICK");
        expect(m.state).toBe("a");
        expect(m.context.n).toBe(2);
        // a-enter (ctor), notify:0 (sub), notify:1, notify:2 — no a-exit, no
        // second a-enter.
        expect(calls).toEqual(["a-enter", "notify:0", "notify:1", "notify:2"]);
    });

    it("subscribe fires the listener immediately and unsubscribe stops further calls", () => {
        const m = makeLight();
        const seen: string[] = [];
        const unsub = m.subscribe((s) => seen.push(s));
        expect(seen).toEqual(["red"]);
        m.send("NEXT");
        expect(seen).toEqual(["red", "green"]);
        unsub();
        m.send("NEXT");
        expect(seen).toEqual(["red", "green"]);
    });

    it("supports onEntry firing once at construction", () => {
        const calls: string[] = [];
        class A extends StateBase<{ tag: string }, "X"> {
            readonly name = "a";
            onEntry(ctx: { tag: string }) {
                calls.push(`a-enter:${ctx.tag}`);
            }
            handle(): TransitionResult<{ tag: string }> {
                return null;
            }
        }
        new Machine<{ tag: string }, "X">({
            initial: "a",
            context: { tag: "start" },
            states: [new A()],
        });
        expect(calls).toEqual(["a-enter:start"]);
    });
});
