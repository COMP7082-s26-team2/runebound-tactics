import type { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import type { TweenManager } from "@/lib/engine/core/TweenManager";
import type { World } from "@/lib/engine/world/World";
import type { GridCoord } from "@/lib/engine/grid/Grid";
import type {
    AnimationStep,
    StepStatus,
} from "../AnimationSequencer";

/**
 * Lunge attack motion: tween from current visual to a point 30% of the way
 * toward the target, then return to origin. Total duration ≈ 250ms split
 * into two halves of equal length.
 *
 * Does NOT change AnimationController state — pair with
 * SetAnimationStateStep("attack") inside a ParallelStep when an attack
 * sprite row should play simultaneously.
 *
 * Cancellation: if cleanup() runs mid-lunge, the in-flight tween is left
 * alone (TweenManager has no cancel). A subsequent sequence's tween will
 * override; the visual may snap. Acceptable for v1.
 */
const LUNGE_FRACTION = 0.3;

export class LungeStep implements AnimationStep {
    readonly duration: number;
    private readonly _halfDuration: number;
    private _phase: "idle" | "going" | "returning" | "done" = "idle";
    private _cancelled = false;

    constructor(
        private readonly _entityId: EntityId,
        private readonly _fromCoord: GridCoord,
        private readonly _targetCoord: GridCoord,
        duration: number,
        private readonly _tween: TweenManager,
        private readonly _world: World,
    ) {
        this.duration = duration;
        this._halfDuration = duration / 2;
    }

    start(): void {
        this._phase = "going";

        const fromWorld = this._world.grid.gridToWorld(this._fromCoord);
        const targetWorld = this._world.grid.gridToWorld(this._targetCoord);
        const visualStart = this._tween.getPosition(this._entityId, fromWorld);

        // Snap the attacker's facing to point at the target ONCE up front,
        // then run the lunge tween with `preserveFacing: true` so neither
        // the forward half nor the return half can flip the facing back to
        // the opposite direction. Without this, the return tween's
        // direction.x is the opposite sign of the forward tween, and the
        // render system ends up freezing facing AWAY from the target.
        const attackVector = targetWorld.sub(visualStart);
        const appearance = this._world.unitAppearance.get(this._entityId);
        if (appearance && Math.abs(attackVector.x) > 0.001) {
            appearance.facingLeft = attackVector.x < 0;
        }

        // Lunge midpoint = visualStart + LUNGE_FRACTION * (targetWorld - visualStart)
        const midpoint = visualStart.add(
            attackVector.scale(LUNGE_FRACTION),
        );

        this._tween.start(
            this._entityId,
            visualStart,
            midpoint,
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
                        midpoint,
                        fromWorld,
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
        // Mark cancelled so the chained "returning" tween is skipped if the
        // "going" half's onComplete fires after cleanup. The "going" tween
        // itself can't be cancelled (TweenManager has no cancel API); a
        // subsequent reconciler-driven tween will override it.
        this._cancelled = true;
    }
}
