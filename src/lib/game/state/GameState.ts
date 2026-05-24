import { EntityId } from "@/lib/engine";

/**
 * idle          — nothing selected
 * selected      — player unit selected; showing movement range + attack targets
 * awaiting-move — unit has attacked; now showing movement range before turn ends
 * moved         — unit moved to an attack-position tile; waiting to attack or end turn
 */
export type TurnPhase = "idle" | "selected" | "awaiting-move" | "moved";

export type TurnPhaseState = {
    onEnter?: (prev: TurnPhase | null) => void
    onUpdate?: (deltaTime: number) => void
    onExit?: (next: TurnPhase | null) => void
}

export type PendingAttack = {
    attackerId: EntityId;
    targetId: EntityId;
}

export class GameState {
    phase: TurnPhase = "idle";
    selectedEntity: EntityId | null = null;
    reachableTiles = new Set<string>();
    reachableAttackableTiles = new Set<string>();
    attackableEntities = new Set<EntityId>();

    pendingAttacks: PendingAttack[] = []
    pendingDeaths: EntityId[] = []
    activePlayerId: string | null = null

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

    add(name: TurnPhase, state: TurnPhaseState) {
        this._states.set(name, state)
    }

    remove(name: TurnPhase) {
        if (this._name === name) {
            throw new Error(`[GameState] Cannot remove active state "${name}"`)
        }

        this._states.delete(name)
    }

    start(initialState: TurnPhase) {
        if (this._started) {
            throw new Error(`[GameState] Already started - call reset() before re-starting`)
        }

        this._started = true
        this._enter(initialState, null)
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
