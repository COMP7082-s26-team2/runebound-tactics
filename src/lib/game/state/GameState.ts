import { EntityId } from "@/lib/engine";

/**
 * idle          — nothing selected
 * selected      — player unit selected; showing movement range + attack targets
 * awaiting-move — unit has attacked; now showing movement range before turn ends
 */
export type TurnPhase = "idle" | "selected" | "awaiting-move";

export type TurnPhaseState = {
    onEnter?: (prev: TurnPhase | null) => void
    onUpdate?: (deltaTime: number) => void
    onExit?: (next: TurnPhase | null) => void
}

export class GameState {
    phase: TurnPhase = "idle";
    selectedEntity: EntityId | null = null;
    reachableTiles = new Set<string>();
    attackableEntities = new Set<EntityId>();

    private _states = new Map<TurnPhase, TurnPhaseState>();
    private _current: TurnPhaseState | null = null;
    private _name: TurnPhase | null = null;
    private _started = false;
    // private _context = null;

    get current() {
        return this._name
    }

    get started() {
        return this._started
    }


    transition(nextName: TurnPhase) {
        if (!this._started) {
            throw new Error(`[GameState] Call start() before transition()`)
        }

        if (!this._states.has(nextName)) {
            throw new Error(`[GameState] Unknown state "${nextName}"`)
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

    private _enter(name: TurnPhase, prevName: TurnPhase | null) {
        if (!this._states.has(name)) {
            throw new Error(`[GameState] Unknown state "${name}"`)
        }

        this._name = name
        this._current = this._states.get(name) || null
        this._current?.onEnter?.(prevName)
    }
}
