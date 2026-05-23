import { GameComponent } from "./GameComponent";

export class ComponentManager {
    private _components: GameComponent[] = [];

    add(component: GameComponent): void {
        this._components.push(component);

        component.init?.();

        // keep render order stable
        this.sort();
    }

    remove(component: GameComponent): void {
        this._components = this._components.filter((c) => c !== component);
        component.destroy?.();
    }

    update(dt: number): void {
        for (const c of this._components) {
            c.update?.(dt);
        }
    }

    draw(ctx: CanvasRenderingContext2D, alpha: number): void {
        for (const c of this._components) {
            c.draw?.(ctx, alpha);
        }
    }

    private sort(): void {
        this._components.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    }
}
