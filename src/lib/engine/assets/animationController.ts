import { GameComponent } from "../core/GameComponent";
import { EntityId } from "../core/ecs/EntityManager";
import { AnimationState } from "./types";

export class AnimationController implements GameComponent {
    private _states = new Map<EntityId, AnimationState>();
    private _frameIndices = new Map<EntityId, number>();
    private _frameTimers = new Map<EntityId, number>();
    private _frameCounts = new Map<EntityId, number>();

    constructor(
        private _frameDuration: (state: AnimationState) => number,
    ) { }

    register(entityId: EntityId, initialState: AnimationState, frameCount: number): void {
        this._states.set(entityId, initialState);
        this._frameIndices.set(entityId, 0);
        this._frameTimers.set(entityId, 0);
        this._frameCounts.set(entityId, frameCount);
    }

    setState(entityId: EntityId, nextState: AnimationState): void {
        if (this._states.get(entityId) === nextState) return;
        this._states.set(entityId, nextState);
        this._frameIndices.set(entityId, 0);
        this._frameTimers.set(entityId, 0);
    }

    getFrameIndex(entityId: EntityId): number {
        return this._frameIndices.get(entityId) ?? 0;
    }

    getState(entityId: EntityId): AnimationState | undefined {
        return this._states.get(entityId);
    }

    update(dt: number): void {
        for (const [entityId, state] of this._states) {
            const frameCount = this._frameCounts.get(entityId) ?? 1;
            const duration = this._frameDuration(state);
            const timer = (this._frameTimers.get(entityId) ?? 0) + dt;

            if (timer >= duration) {
                const current = this._frameIndices.get(entityId) ?? 0;
                this._frameIndices.set(entityId, (current + 1) % frameCount);
                this._frameTimers.set(entityId, timer - duration);
            } else {
                this._frameTimers.set(entityId, timer);
            }
        }
    }
}
