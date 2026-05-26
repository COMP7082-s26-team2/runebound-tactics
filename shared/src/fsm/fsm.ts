/**
 * Generic synchronous state machine primitive.
 *
 * Shape:
 *   - StateKey / EventKey are string-literal unions for compile-time validation.
 *   - Context is a typed object; effects (onEntry, onExit, transition action) may
 *     return a Partial<Context> that is merged via spread.
 *   - Transitions may be a target string, or an object with optional guard + action.
 *   - send() is synchronous. Effects must be synchronous in this version.
 *
 * Transition order on a successful send():
 *   current.onExit → transition.action → state change → next.onEntry → notify subscribers.
 *
 * The initial state's onEntry fires once at construction. Subscribers are notified
 * immediately on subscribe() with the current state and context.
 *
 * Unknown events or guarded-out transitions are silent (no throw, no console).
 */

type Effect<Ctx> = (ctx: Ctx, payload?: unknown) => Partial<Ctx> | void;

type TransitionObject<Ctx, StateKey extends string> = {
    target: StateKey;
    guard?: (ctx: Ctx, payload?: unknown) => boolean;
    action?: Effect<Ctx>;
};

export type StateConfig<
    Ctx,
    StateKey extends string,
    EventKey extends string,
> = {
    onEntry?: Effect<Ctx>;
    onExit?: Effect<Ctx>;
    on?: Partial<Record<EventKey, StateKey | TransitionObject<Ctx, StateKey>>>;
};

export type MachineConfig<
    Ctx,
    StateKey extends string,
    EventKey extends string,
> = {
    initial: StateKey;
    context: Ctx;
    states: Record<StateKey, StateConfig<Ctx, StateKey, EventKey>>;
};

export type StateMachineListener<Ctx, StateKey extends string> = (
    state: StateKey,
    context: Readonly<Ctx>,
) => void;

export class StateMachine<
    Ctx extends object,
    StateKey extends string,
    EventKey extends string,
> {
    private _state: StateKey;
    private _context: Ctx;
    private _listeners = new Set<StateMachineListener<Ctx, StateKey>>();

    constructor(
        private readonly _config: MachineConfig<Ctx, StateKey, EventKey>,
    ) {
        this._state = _config.initial;
        this._context = _config.context;
        this._runEffect(this._config.states[this._state]?.onEntry);
    }

    get state(): StateKey {
        return this._state;
    }

    get context(): Readonly<Ctx> {
        return this._context;
    }

    send(event: EventKey, payload?: unknown): void {
        const stateConfig = this._config.states[this._state];
        const transition = stateConfig?.on?.[event];

        if (!transition) return;

        let target: StateKey;
        let action: Effect<Ctx> | undefined;

        if (typeof transition === "string") {
            target = transition as StateKey;
        } else {
            if (transition.guard && !transition.guard(this._context, payload)) {
                return;
            }
            target = transition.target;
            action = transition.action;
        }

        this._runEffect(stateConfig?.onExit);
        this._runEffect(action, payload);
        this._state = target;
        this._runEffect(this._config.states[target]?.onEntry);
        this._notify();
    }

    subscribe(listener: StateMachineListener<Ctx, StateKey>): () => void {
        this._listeners.add(listener);
        listener(this._state, this._context);
        return () => {
            this._listeners.delete(listener);
        };
    }

    private _runEffect(
        effect: Effect<Ctx> | undefined,
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
            listener(this._state, this._context);
        }
    }
}
