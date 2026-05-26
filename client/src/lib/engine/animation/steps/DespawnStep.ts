import type { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import type { World } from "@/lib/engine/world/World";
import type { AnimationController } from "@/lib/engine/assets/animationController";
import type {
    AnimationStep,
    StepStatus,
} from "../AnimationSequencer";

/**
 * Removes the entity from the world AND the animation controller.
 * Instantaneous (duration = 0).
 *
 * Placed at the end of death sequences so the visual stays on screen
 * for the full death animation; the schema-level removal already happened
 * server-side. EventBus emit (e.g. unit:despawn) is handled by the
 * scene's reconcile loop, not this step.
 */
export class DespawnStep implements AnimationStep {
    readonly duration = 0;

    constructor(
        private readonly _entityId: EntityId,
        private readonly _world: World,
        private readonly _anim: AnimationController,
    ) {}

    start(): void {
        this._anim.deregister(this._entityId);
        if (this._world.gridPositions.get(this._entityId) !== undefined) {
            this._world.removeUnit(this._entityId);
        }
    }

    update(): StepStatus {
        return "completed";
    }

    cleanup(): void {
        /* no-op */
    }
}
