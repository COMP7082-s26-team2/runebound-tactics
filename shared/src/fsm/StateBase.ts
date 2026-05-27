/**
 * Abstract base for class-per-state FSM nodes.
 *
 * Subclass per state. `name` must match the key the Machine registers it
 * under. `handle` returns one of:
 *   - target state name string (no action)
 *   - { target, action? } object (transition with optional effect)
 *   - null to ignore the event silently
 *
 * Self-loop is first-class: return `this.name` (with optional action) to fire
 * the action and notify subscribers without invoking onExit/onEntry.
 *
 * Pure-shared rule: state class methods must not call into Colyseus, the
 * client World, or any host-only API. All persistent data lives in the
 * shared `Ctx`. Host-side side effects belong in `Machine.subscribe`
 * callbacks.
 */

export type StateAction<Ctx> = (
    ctx: Ctx,
    payload?: unknown,
) => Partial<Ctx> | void;

export type TransitionResult<Ctx> =
    | string
    | { target: string; action?: StateAction<Ctx> }
    | null;

export abstract class StateBase<
    Ctx extends object,
    EventKey extends string,
> {
    abstract readonly name: string;

    onEntry(_ctx: Ctx, _payload?: unknown): Partial<Ctx> | void {
        return;
    }

    onExit(_ctx: Ctx, _payload?: unknown): Partial<Ctx> | void {
        return;
    }

    abstract handle(
        event: EventKey,
        ctx: Ctx,
        payload?: unknown,
    ): TransitionResult<Ctx>;
}
