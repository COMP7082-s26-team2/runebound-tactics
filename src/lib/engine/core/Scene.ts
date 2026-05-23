import { ComponentManager } from "./ComponentManager";

export abstract class Scene {
    public readonly components = new ComponentManager();

    abstract init(): void;
    abstract destroy(): void;

    update(dt: number): void {
        this.components.update(dt);
    }

    draw(ctx: CanvasRenderingContext2D, alpha: number): void {
        this.components.draw(ctx, alpha);
    }
}
