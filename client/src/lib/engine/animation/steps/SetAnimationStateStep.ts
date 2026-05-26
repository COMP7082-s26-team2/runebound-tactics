import type { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import type { AnimationController } from "@/lib/engine/assets/animationController";
import type { AnimationState } from "@/lib/engine/assets/types";
import type { World } from "@/lib/engine/world/World";
import type {
    AnimationStep,
    StepContext,
    StepStatus,
} from "../AnimationSequencer";

/**
 * Flips the entity's AnimationController state for `duration` seconds,
 * then restores the prior state on cleanup. Useful for "play attack
 * frames during the lunge" pairing inside a ParallelStep.
 *
 * Writes the state to BOTH the AnimationController (drives frame index
 * cycling) AND to `appearance.animationState` (read by UnitRenderSystem
 * to pick the sprite-sheet row). Without the appearance write, the
 * frames would cycle but the renderer would still draw the prior row.
 *
 * If the prior state was unknown (entity not yet registered), cleanup
 * falls back to "idle".
 */
export class SetAnimationStateStep implements AnimationStep {
    readonly duration: number;
    private _priorState: AnimationState | undefined;

    constructor(
        private readonly _entityId: EntityId,
        private readonly _state: AnimationState,
        duration: number,
        private readonly _anim: AnimationController,
        private readonly _world: World,
    ) {
        this.duration = duration;
    }

    start(): void {
        this._priorState = this._anim.getState(this._entityId);
        this._anim.setState(this._entityId, this._state);
        const appearance = this._world.unitAppearance.get(this._entityId);
        if (appearance) appearance.animationState = this._state;
    }

    update(_dt: number, ctx: StepContext): StepStatus {
        return ctx.elapsed >= this.duration ? "completed" : "running";
    }

    cleanup(): void {
        const restored = this._priorState ?? "idle";
        this._anim.setState(this._entityId, restored);
        const appearance = this._world.unitAppearance.get(this._entityId);
        if (appearance) appearance.animationState = restored;
    }
}
