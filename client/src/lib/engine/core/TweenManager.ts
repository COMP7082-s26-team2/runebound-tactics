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
}

export class TweenManager implements GameComponent {
    private _tweens = new Map<EntityId, Tween>();

    /** Single-segment convenience — keeps existing call sites working. */
    start(
        entityId: EntityId,
        from: Vector2D,
        to: Vector2D,
        duration: number,
        onComplete?: () => void,
    ): void {
        this.startPath(entityId, [from, to], duration, onComplete);
    }

    /**
     * Animate through an ordered list of pixel waypoints.
     * Each segment takes `stepDuration` seconds.
     */
    startPath(
        entityId: EntityId,
        waypoints: Vector2D[],
        stepDuration: number,
        onComplete?: () => void,
    ): void {
        if (waypoints.length < 2) return;
        this._tweens.set(entityId, {
            waypoints: [...waypoints],
            stepDuration,
            elapsed: 0,
            onComplete,
        });
    }

    /** Returns the current interpolated pixel position, or `fallback` if no tween is active. */
    getPosition(entityId: EntityId, fallback: Vector2D): Vector2D {
        const tween = this._tweens.get(entityId);
        if (!tween || tween.waypoints.length < 2) return fallback;

        const t = easeOutCubic(Math.min(tween.elapsed / tween.stepDuration, 1));
        return tween.waypoints[0].lerp(tween.waypoints[1], t);
    }

    /** Returns the current segment direction, or null if no tween is active. */
    getDirection(entityId: EntityId): Vector2D | null {
        const tween = this._tweens.get(entityId);
        if (!tween || tween.waypoints.length < 2) return null;

        return tween.waypoints[1].sub(tween.waypoints[0]);
    }

    isMoving(entityId: EntityId): boolean {
        return this._tweens.has(entityId);
    }

    update(dt: number): void {
        for (const [entityId, tween] of this._tweens) {
            tween.elapsed += dt;

            // Advance through completed steps without losing leftover time
            while (tween.elapsed >= tween.stepDuration && tween.waypoints.length > 2) {
                tween.elapsed -= tween.stepDuration;
                tween.waypoints.shift();
            }

            if (tween.elapsed >= tween.stepDuration && tween.waypoints.length <= 2) {
                tween.onComplete?.();
                this._tweens.delete(entityId);
            }
        }
    }
}
