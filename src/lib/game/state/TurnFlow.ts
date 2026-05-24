export type TurnFlowPhase =
    | "action-phase"
    | "declare-end-turn"
    | "quick-play"
    | "combat"
    | "post-combat";

export type TurnFlowState = {
    onEnter?: (prev: TurnFlowPhase | null) => void
    onUpdate?: (deltaTime: number) => void
    onExit?: (next: TurnFlowPhase | null) => void
}

export class TurnFlow {
    private _states = new Map<TurnFlowPhase, TurnFlowState>();
    private _current: TurnFlowState | null = null;
    private _name: TurnFlowPhase | null = null;
    private _started = false;

    get current() {
        return this._name
    }

    get started() {
        return this._started
    }

    add(name: TurnFlowPhase, state: TurnFlowState) {
        this._states.set(name, state)
    }

    start(initialState: TurnFlowPhase) {
        if (this._started) {
            throw new Error(`[TurnFlow] Already started - call reset() before re-starting`)
        }

        this._started = true
        this._enter(initialState, null)
    }

    transition(nextName: TurnFlowPhase) {
        if (!this._started) {
            throw new Error(`[TurnFlow] Call start() before transition()`)
        }

        if (!this._states.has(nextName)) {
            throw new Error(`[TurnFlow] Unknown state "${nextName}"`)
        }

        const prev = this._name
        this._current?.onExit?.(nextName)
        this._enter(nextName, prev)
    }

    update(dTime: number) {
        if (!this._started) return

        this._current?.onUpdate?.(dTime)
    }

    reset() {
        if (this._started && this._current) {
            this._current.onExit?.(null)
        }

        this._current = null
        this._name = null
        this._started = false
    }

    private _enter(name: TurnFlowPhase, prevName: TurnFlowPhase | null) {
        if (!this._states.has(name)) {
            throw new Error(`[TurnFlow] Unknown state "${name}"`)
        }

        this._name = name
        this._current = this._states.get(name) || null
        this._current?.onEnter?.(prevName)
    }
}
