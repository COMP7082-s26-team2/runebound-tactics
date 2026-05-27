import { GameComponent } from "./GameComponent";
import { EntityId } from "./ecs/EntityManager";
import { Vector2D } from "./Vector2D";

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

interface Tween {
    waypoints: Vector2D[]; // [currentFrom, nextTo, ...remaining]
    stepDuration: number;
    elapsed: number;
    onComplete?: () => void;
    /**
     * If true, `getDirection()` returns null for this tween so consumers
     * like UnitRenderSystem don't flip the entity's facing direction.
     * Used by RecoilStep — a hit unit shouldn't visually turn around just
     * because it's being knocked back.
     */
    preserveFacing?: boolean;
}

export interface TweenOptions {
    onComplete?: () => void;
    preserveFacing?: boolean;
}

export class TweenManager implements GameComponent {
    private _tweens = new Map<EntityId, Tween>();

    /** Single-segment convenience — keeps existing call sites working. */
    start(
        entityId: EntityId,
        from: Vector2D,
        to: Vector2D,
        duration: number,
        onCompleteOrOptions?: (() => void) | TweenOptions,
    ): void {
        this.startPath(entityId, [from, to], duration, onCompleteOrOptions);
    }

    /**
     * Animate through an ordered list of pixel waypoints.
     * Each segment takes `stepDuration` seconds.
     *
     * Pass `TweenOptions` (or a bare callback) to control completion and
     * facing-direction behavior.
     */
    startPath(
        entityId: EntityId,
        waypoints: Vector2D[],
        stepDuration: number,
        onCompleteOrOptions?: (() => void) | TweenOptions,
    ): void {
        if (waypoints.length < 2) return;

        const options: TweenOptions =
            typeof onCompleteOrOptions === "function"
                ? { onComplete: onCompleteOrOptions }
                : onCompleteOrOptions ?? {};

        this._tweens.set(entityId, {
            waypoints: [...waypoints],
            stepDuration,
            elapsed: 0,
            onComplete: options.onComplete,
            preserveFacing: options.preserveFacing,
        });
    }

    /** Returns the current interpolated pixel position, or `fallback` if no tween is active. */
    getPosition(entityId: EntityId, fallback: Vector2D): Vector2D {
        const tween = this._tweens.get(entityId);
        if (!tween || tween.waypoints.length < 2) return fallback;

        const t = easeOutCubic(Math.min(tween.elapsed / tween.stepDuration, 1));
        return tween.waypoints[0].lerp(tween.waypoints[1], t);
    }

    /**
     * Returns the current segment direction, or null if no tween is active.
     * Tweens flagged with `preserveFacing: true` also return null so the
     * caller treats them as facing-neutral.
     */
    getDirection(entityId: EntityId): Vector2D | null {
        const tween = this._tweens.get(entityId);
        if (!tween || tween.waypoints.length < 2) return null;
        if (tween.preserveFacing) return null;

        return tween.waypoints[1].sub(tween.waypoints[0]);
    }

    isMoving(entityId: EntityId): boolean {
        return this._tweens.has(entityId);
    }

    update(dt: number): void {
        // Snapshot entries up front — `onComplete` callbacks may call
        // `this.start(...)` to chain a follow-up tween, which mutates the
        // backing Map mid-iteration. Iterating over a static snapshot keeps
        // the loop deterministic.
        const entries = Array.from(this._tweens.entries());
        for (const [entityId, tween] of entries) {
            tween.elapsed += dt;

            // Advance through completed steps without losing leftover time
            while (tween.elapsed >= tween.stepDuration && tween.waypoints.length > 2) {
                tween.elapsed -= tween.stepDuration;
                tween.waypoints.shift();
            }

            if (tween.elapsed >= tween.stepDuration && tween.waypoints.length <= 2) {
                tween.onComplete?.();
                // `onComplete` may have replaced the entry by chaining a new
                // tween for this entity. Only delete if the entry is still
                // the same tween we just finished — otherwise we'd wipe the
                // freshly-queued follow-up. Bug fix: chained LungeStep /
                // RecoilStep used to lose their return half this way.
                if (this._tweens.get(entityId) === tween) {
                    this._tweens.delete(entityId);
                }
            }
        }
    }
}
