import { Grid } from "@/lib/engine/grid/Grid";
import { ComponentManager } from "@/lib/engine/ComponentManager";

export class World {
    public components = new ComponentManager();
    public grid: Grid;

    constructor(grid: Grid) {
        this.grid = grid;
    }

    update(dt: number) {
        this.components.update(dt);
    }

    draw(ctx: CanvasRenderingContext2D, alpha: number) {
        this.components.draw(ctx, alpha);
    }
}