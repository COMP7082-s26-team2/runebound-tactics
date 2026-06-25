import type { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import type { World } from "@/lib/engine/world/World";
import type {
    AnimationStep,
    StepContext,
    StepStatus,
} from "../AnimationSequencer";

interface FadeValues {
    alpha?: number;
    scale?: number;
}

export interface FadeStepOptions {
    from: FadeValues;
    to: FadeValues;
    duration: number;
}

/**
 * Interpolates AppearanceData.alpha and (optionally) AppearanceData.scale
 * over `duration` seconds. Leaves the final values in place on cleanup —
 * caller is responsible for any subsequent reset (or DespawnStep).
 *
 * Used for the death fade-and-shrink fallback when a sprite sheet doesn't
 * have a "death" row.
 */
export class FadeStep implements AnimationStep {
    readonly duration: number;
    private readonly _from: FadeValues;
    private readonly _to: FadeValues;

    constructor(
        private readonly _entityId: EntityId,
        options: FadeStepOptions,
        private readonly _world: World,
    ) {
        this._from = options.from;
        this._to = options.to;
        this.duration = options.duration;
    }

    start(): void {
        const appearance = this._world.unitAppearance.get(this._entityId);
        if (!appearance) return;
        if (this._from.alpha !== undefined) appearance.alpha = this._from.alpha;
        if (this._from.scale !== undefined) appearance.scale = this._from.scale;
    }

    update(_dt: number, ctx: StepContext): StepStatus {
        const appearance = this._world.unitAppearance.get(this._entityId);
        if (!appearance) return "completed";   // entity gone — nothing to fade

        const t = this.duration > 0
            ? Math.min(ctx.elapsed / this.duration, 1)
            : 1;

        if (this._from.alpha !== undefined && this._to.alpha !== undefined) {
            appearance.alpha = lerp(this._from.alpha, this._to.alpha, t);
        }
        if (this._from.scale !== undefined && this._to.scale !== undefined) {
            appearance.scale = lerp(this._from.scale, this._to.scale, t);
        }

        return t >= 1 ? "completed" : "running";
    }

    cleanup(): void {
        /* leave final values in place */
    }
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}
