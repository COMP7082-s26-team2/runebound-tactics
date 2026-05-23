import { EntityId } from "@/lib/engine";

/**
 * idle          — nothing selected
 * selected      — player unit selected; showing movement range + attack targets
 * awaiting-move — unit has attacked; now showing movement range before turn ends
 */
export type TurnPhase = "idle" | "selected" | "awaiting-move";

export type TurnPhaseState = {
    onEnter?: (prev: TurnPhase | null) => void
    onExit?: (next: TurnPhase | null) => void
}

export class GameState {
    phase: TurnPhase = "idle";
    selectedEntity: EntityId | null = null;
    reachableTiles = new Set<string>();
    attackableEntities = new Set<EntityId>();

    private _states = new Map<TurnPhase, TurnPhaseState>();
    private _current: TurnPhaseState | null = null;
    private _name: string | null = null;
    private _started = false;
    // private _context = null;

    get current() {
        return this._name
    }

    get started() {
        return this._started
    }

    private _enter(name: TurnPhase, prevName: TurnPhase) {
        if (!this._states.has(name)) {
            throw new Error(`[GameState] Unknown state "${name}"`)
        }

        this._name = name
        this._current = this._states.get(name) || null
        this._current?.onEnter?.(prevName)
    }
}
