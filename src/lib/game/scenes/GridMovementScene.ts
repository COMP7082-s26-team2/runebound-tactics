import { Scene } from "@/lib/engine/core/Scene";
import { World } from "@/lib/engine/world/World";
import { SquareGrid } from "@/lib/engine/grid/SquareGrid";
import { GridRenderSystem } from "@/lib/game/systems/GridRenderSystem";
import { UnitRenderSystem } from "@/lib/game/systems/UnitRenderSystem";

export class GridMovementScene extends Scene {
    private _world: World | null = null;

    get world(): World | null {
        return this._world;
    }

    init(): void {
        const grid = new SquareGrid(50);
        this._world = new World(grid);

        this._world.spawnUnit(
            { q: 2, r: 3 },
            { attack: 10, health: 100, movement: 3, name: "Warrior", defense: 5 },
            { color: "red" },
        );

        this._world.spawnUnit(
            { q: 5, r: 6 },
            { attack: 10, health: 100, movement: 3, name: "Archer", defense: 5 },
            { color: "green" },
        );

        this.components.add(new GridRenderSystem(this._world, 10, 10, 80));
        this.components.add(new UnitRenderSystem(this._world, 10, 10, 80));
    }

    destroy(): void {
        this._world = null;
    }
}
