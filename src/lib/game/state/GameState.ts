import { EntityId } from "@/lib/engine";

/**
 * idle          — nothing selected
 * selected      — player unit selected; showing movement range + attack targets
 * awaiting-move — unit has attacked; now showing movement range before turn ends
 * moved         — unit moved to an attack-position tile; waiting to attack or end turn
 */
export type TurnPhase = "idle" | "selected" | "awaiting-move" | "moved";

export class GameState {
    phase: TurnPhase = "idle";
    selectedEntity: EntityId | null = null;
    reachableTiles = new Set<string>();
    reachableAttackableTiles = new Set<string>();
    attackableEntities = new Set<EntityId>();
}
