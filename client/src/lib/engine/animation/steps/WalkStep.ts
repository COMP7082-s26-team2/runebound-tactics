import type { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import type { TweenManager } from "@/lib/engine/core/TweenManager";
import type { AnimationController } from "@/lib/engine/assets/animationController";
import type { World } from "@/lib/engine/world/World";
import type { GridCoord } from "@/lib/engine/grid/Grid";
import type {
    AnimationStep,
    StepStatus,
} from "../AnimationSequencer";

/**
 * Walks an entity along a grid path, one cell per `stepDuration` seconds.
 * Sets animation state to "walk" on start; restores to "idle" on cleanup.
 *
 * If the path has 0 or 1 coords, the step completes immediately
 * (no visible motion). The first coord is treated as the path's starting
 * cell — the visual position at start may differ if a prior tween left
 * the entity mid-cell; we read the current visual via tween.getPosition.
 */
export class WalkStep implements AnimationStep {
    readonly duration: number;

    constructor(
        private readonly _entityId: EntityId,
        private readonly _path: GridCoord[],
        private readonly _stepDuration: number,
        private readonly _tween: TweenManager,
        private readonly _anim: AnimationController,
        private readonly _world: World,
    ) {
        const segments = Math.max(0, this._path.length - 1);
        this.duration = segments * this._stepDuration;
    }

    start(): void {
        if (this._path.length < 2) return;

        // Convert grid coords to pixel waypoints; honor current visual pos
        // for the first waypoint so mid-tween reconciles don't snap.
        const firstFallback = this._world.grid.gridToWorld(this._path[0]!);
        const firstVisual = this._tween.getPosition(this._entityId, firstFallback);
        const waypoints = [
            firstVisual,
            ...this._path.slice(1).map((c) => this._world.grid.gridToWorld(c)),
        ];

        this._tween.startPath(this._entityId, waypoints, this._stepDuration);
        this._anim.setState(this._entityId, "walk");
    }

    update(): StepStatus {
        if (this._path.length < 2) return "completed";
        return this._tween.isMoving(this._entityId) ? "running" : "completed";
    }

    cleanup(): void {
        this._anim.setState(this._entityId, "idle");
    }
}
