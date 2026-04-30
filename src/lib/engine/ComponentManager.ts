import { GameComponent } from "./GameComponent";

export class ComponentManager {
    private components: GameComponent[] = [];

    add(component: GameComponent): void {
        this.components.push(component);

        component.init?.();

        // keep render order stable
        this.sort();
    }

    remove(component: GameComponent): void {
        this.components = this.components.filter(c => c !== component);
        component.destroy?.();
    }

    update(dt: number): void {
        for (const c of this.components) {
            c.update?.(dt);
        }
    }

    draw(ctx: CanvasRenderingContext2D, alpha: number): void {
        for (const c of this.components) {
            c.draw?.(ctx, alpha);
        }
    }

    private sort(): void {
        this.components.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    }
}