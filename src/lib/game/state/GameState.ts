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

}
