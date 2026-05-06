import { GameComponent, TweenManager, AnimationController, World } from "@/lib/engine";

export class UnitAnimationSystem implements GameComponent {
    constructor(
        private _world: World,
        private _tweens: TweenManager,
        private _animationController: AnimationController,
    ) { }

    update(_dt: number): void {
        for (const [, entityId] of this._world.occupancyMap.entries()) {
            const state = this._tweens.isMoving(entityId) ? "walk" : "idle";
            this._animationController.setState(entityId, state);

            const appearance = this._world.unitAppearance.get(entityId);
            if (appearance) appearance.animationState = state;
        }
    }
}
