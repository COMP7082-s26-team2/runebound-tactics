import type { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import type { TweenManager } from "@/lib/engine/core/TweenManager";
import type { World } from "@/lib/engine/world/World";
import type { GridCoord } from "@/lib/engine/grid/Grid";
import type {
    AnimationStep,
    StepStatus,
} from "../AnimationSequencer";

/**
 * Knockback reaction for an attacked unit. Visually mirrors `LungeStep`
 * but moves the entity AWAY from a source point (the attacker), then
 * returns to its origin.
 *
 * Pair inside a ParallelStep with `SetAnimationStateStep(entity, "damage")`
 * so the damage sprite row plays during the recoil.
 *
 * Cancellation behavior is identical to LungeStep: the going tween cannot
 * be hard-cancelled (TweenManager has no cancel API), but the chained
 * "returning" tween is skipped via the `_cancelled` flag.
 */
export class RecoilStep implements AnimationStep {
    readonly duration: number;
    private readonly _halfDuration: number;
    private readonly _fraction: number;
    private _phase: "idle" | "going" | "returning" | "done" = "idle";
    private _cancelled = false;

    constructor(
        private readonly _entityId: EntityId,
        private readonly _selfCoord: GridCoord,
        private readonly _sourceCoord: GridCoord,
        duration: number,
        fraction: number,
        private readonly _tween: TweenManager,
        private readonly _world: World,
    ) {
        this.duration = duration;
        this._halfDuration = duration / 2;
        this._fraction = fraction;
    }

    start(): void {
        this._phase = "going";

        const selfWorld = this._world.grid.gridToWorld(this._selfCoord);
        const sourceWorld = this._world.grid.gridToWorld(this._sourceCoord);
        const visualStart = this._tween.getPosition(this._entityId, selfWorld);

        // Push AWAY from source: pushTarget = visualStart + fraction * (visualStart - sourceWorld)
        const awayDir = visualStart.sub(sourceWorld);
        const pushTarget = visualStart.add(awayDir.scale(this._fraction));

        this._tween.start(
            this._entityId,
            visualStart,
            pushTarget,
            this._halfDuration,
            {
                preserveFacing: true,
                onComplete: () => {
                    if (this._cancelled) {
                        this._phase = "done";
                        return;
                    }
                    this._tween.start(
                        this._entityId,
                        pushTarget,
                        selfWorld,
                        this._halfDuration,
                        {
                            preserveFacing: true,
                            onComplete: () => {
                                this._phase = "done";
                            },
                        },
                    );
                    this._phase = "returning";
                },
            },
        );
    }

    update(): StepStatus {
        return this._phase === "done" ? "completed" : "running";
    }

    cleanup(): void {
        this._cancelled = true;
    }
}
