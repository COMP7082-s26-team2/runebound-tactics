import type { StateAction, StateBase } from "./StateBase";

/**
 * Class-per-state FSM orchestrator.
 *
 * Replaces the legacy config-object `StateMachine` in `./fsm.ts`. Public
 * surface (`state`, `context`, `send`, `subscribe`) is identical so callers
 * are unaffected.
 *
 * Transition order on send():
 *   current.onExit → action → state change → next.onEntry → notify.
 *
 * Self-loop (target === current.name): action fires, listeners notified,
 * onExit/onEntry skipped.
 *
 * Initial state's onEntry fires once at construction. subscribe() fires the
 * listener immediately with current state + context.
 *
 * Unknown events / null `handle` returns are silent.
 */

export type MachineListener<Ctx> = (
    state: string,
    context: Readonly<Ctx>,
) => void;

export interface MachineConfig<Ctx extends object, EventKey extends string> {
    initial: string;
    context: Ctx;
    states: StateBase<Ctx, EventKey>[];
}

export class Machine<Ctx extends object, EventKey extends string> {
    private _states: Map<string, StateBase<Ctx, EventKey>>;
    private _current: StateBase<Ctx, EventKey>;
    private _context: Ctx;
    private _listeners = new Set<MachineListener<Ctx>>();

    constructor(config: MachineConfig<Ctx, EventKey>) {
        this._states = new Map(config.states.map((s) => [s.name, s]));
        const initial = this._states.get(config.initial);
        if (!initial) {
            throw new Error(
                `Initial state "${config.initial}" not registered`,
            );
        }
        this._current = initial;
        this._context = config.context;
        this._runEffect(this._current.onEntry.bind(this._current));
    }

    get state(): string {
        return this._current.name;
    }

    get context(): Readonly<Ctx> {
        return this._context;
    }

    send(event: EventKey, payload?: unknown): void {
        const result = this._current.handle(event, this._context, payload);
        if (result === null) return;

        let target: string;
        let action: StateAction<Ctx> | undefined;

        if (typeof result === "string") {
            target = result;
        } else {
            target = result.target;
            action = result.action;
        }

        if (target === this._current.name) {
            this._runEffect(action, payload);
            this._notify();
            return;
        }

        const next = this._states.get(target);
        if (!next) return;

        this._runEffect(this._current.onExit.bind(this._current), payload);
        this._runEffect(action, payload);
        this._current = next;
        this._runEffect(this._current.onEntry.bind(this._current), payload);
        this._notify();
    }

    subscribe(listener: MachineListener<Ctx>): () => void {
        this._listeners.add(listener);
        listener(this._current.name, this._context);
        return () => {
            this._listeners.delete(listener);
        };
    }

    private _runEffect(
        effect: StateAction<Ctx> | undefined,
        payload?: unknown,
    ): void {
        if (!effect) return;
        const result = effect(this._context, payload);
        if (result) {
            this._context = { ...this._context, ...result };
        }
    }

    private _notify(): void {
        for (const listener of this._listeners) {
            listener(this._current.name, this._context);
        }
    }
}
