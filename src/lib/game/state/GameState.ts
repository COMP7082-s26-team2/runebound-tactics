import { EntityId } from "@/lib/engine/core/ecs/EntityManager";

/**
 * idle          — nothing selected
 * selected      — player unit selected; showing movement range + attack targets
 * awaiting-move — unit has attacked; now showing movement range before turn ends
 */
export type TurnPhase = "idle" | "selected" | "awaiting-move";

export class GameState {
    phase: TurnPhase = "idle";
    selectedEntity: EntityId | null = null;
    reachableTiles = new Set<string>();
    attackableEntities = new Set<EntityId>();
}
