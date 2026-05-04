import { Scene } from "@/lib/engine/core/Scene";
import { TweenManager } from "@/lib/engine/core/TweenManager";
import { World } from "@/lib/engine/world/World";
import { SquareGrid } from "@/lib/engine/grid/SquareGrid";
import { GridRenderSystem } from "@/lib/game/systems/GridRenderSystem";
import { UnitRenderSystem } from "@/lib/game/systems/UnitRenderSystem";
import { MovementRangeSystem } from "@/lib/game/systems/MovementRangeSystem";
import { SelectionSystem } from "@/lib/game/systems/SelectionSystem";
import { InputSystem } from "@/lib/game/systems/InputSystem";
import { GameState } from "@/lib/game/state/GameState";

const GRID_COLS = 10;
const GRID_ROWS = 10;
const CELL_SIZE = 80;

export class GridMovementScene extends Scene {
    private _canvas: HTMLCanvasElement;
    private _world: World | null = null;
    public input: InputSystem;
    public state = new GameState();

    constructor(canvas: HTMLCanvasElement) {
        super();
        this._canvas = canvas;
        this.input = new InputSystem(canvas);
    }

    get world(): World | null {
        return this._world;
    }

    init(): void {
        const grid = new SquareGrid(CELL_SIZE);
        this._world = new World(grid);

        this._world.spawnUnit(
            { q: 2, r: 3 },
            { attack: 10, health: 100, movement: 5, name: "Warrior", defense: 5, attackRange: 1 },
            { color: "red" },
        );

        this._world.spawnUnit(
            { q: 5, r: 6 },
            { attack: 8, health: 80, movement: 2, name: "Skeleton", defense: 2, attackRange: 1 },
            { color: "purple" },
        );

        const tweens = new TweenManager();
        this.components.add(tweens);
        this.components.add(new UnitRenderSystem(this._world, GRID_COLS, GRID_ROWS, CELL_SIZE, tweens));
        this.components.add(new SelectionSystem(this._world, CELL_SIZE, this.state, this.input, tweens));
        this.components.add(new GridRenderSystem(this._world, GRID_COLS, GRID_ROWS, CELL_SIZE));
        this.components.add(new MovementRangeSystem(this._world, CELL_SIZE, this.state));
        this.components.add(this.input);
    }

    destroy(): void {
        this._world = null;
    }
}
