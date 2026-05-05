import { Scene, TweenManager, World, SquareGrid, AssetHandler } from "@/lib/engine";
import {
    GridRenderSystem,
    UnitRenderSystem,
    MovementRangeSystem,
    SelectionSystem,
    InputSystem,
} from "@/lib/game/systems";
import { GameState } from "@/lib/game/state/GameState";

/**
 * A simple scene demonstrating grid-based movement and combat.
 * - Click a unit to select it and see its movement range (blue) and attackable enemies (red).
 * - Click a highlighted tile to move, or an attackable enemy to attack.
 * - Units are represented as sprites or colored squares (fallback).
 */

const GRID_COLS = 10;
const GRID_ROWS = 10;
const CELL_SIZE = 80;

export class GridMovementScene extends Scene {
    private _canvas: HTMLCanvasElement;
    private _world: World | null = null;
    public input: InputSystem;
    public state = new GameState();
    private _assetHandler?: AssetHandler;

    constructor(canvas: HTMLCanvasElement, assetHandler?: AssetHandler) {
        super();
        this._canvas = canvas;
        this._assetHandler = assetHandler;
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
            {
                attack: 10,
                health: 100,
                movement: 5,
                name: "Swordsman",
                defense: 5,
                attackRange: 1,
            },
            {
                assetKey: "tilemap:entity:castle:swordsman",
                animationState: "idle",
                color: "red",
            },
        );

        this._world.spawnUnit(
            { q: 5, r: 6 },
            {
                attack: 8,
                health: 80,
                movement: 2,
                name: "Spider",
                defense: 2,
                attackRange: 1,
            },
            {
                assetKey: "tilemap:entity:necropolis:spider",
                animationState: "idle",
                facingLeft: true,
                color: "purple",
            },
        );

        const tweens = new TweenManager();
        this.components.add(tweens);
        this.components.add(
            new UnitRenderSystem(
                this._world,
                GRID_COLS,
                GRID_ROWS,
                CELL_SIZE,
                tweens,
                this._assetHandler,
            ),
        );
        this.components.add(
            new SelectionSystem(
                this._world,
                CELL_SIZE,
                this.state,
                this.input,
                tweens,
            ),
        );
        this.components.add(
            new GridRenderSystem(this._world, GRID_COLS, GRID_ROWS, CELL_SIZE),
        );
        this.components.add(
            new MovementRangeSystem(this._world, CELL_SIZE, this.state),
        );
        this.components.add(this.input);
    }

    destroy(): void {
        this._world = null;
    }
}
