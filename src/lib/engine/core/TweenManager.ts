import { GameComponent } from "./GameComponent";
import { EntityId } from "./ecs/EntityManager";

export type Vec2 = { x: number; y: number };

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

interface Tween {
    waypoints: Vec2[]; // [currentFrom, nextTo, ...remaining]
    stepDuration: number;
    elapsed: number;
    onComplete?: () => void;
}

export class TweenManager implements GameComponent {
    private _tweens = new Map<EntityId, Tween>();

    /** Single-segment convenience — keeps existing call sites working. */
    start(
        entityId: EntityId,
        from: Vec2,
        to: Vec2,
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
        waypoints: Vec2[],
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
    getPosition(entityId: EntityId, fallback: Vec2): Vec2 {
        const tween = this._tweens.get(entityId);
        if (!tween || tween.waypoints.length < 2) return fallback;

        const t = easeOutCubic(Math.min(tween.elapsed / tween.stepDuration, 1));
        const from = tween.waypoints[0];
        const to = tween.waypoints[1];
        return {
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
        };
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
