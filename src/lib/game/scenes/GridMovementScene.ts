import { Scene, TweenManager, World, SquareGrid, EventBus } from "@/lib/engine";
import {
    GridRenderSystem,
    UnitRenderSystem,
    MovementRangeSystem,
    SelectionSystem,
    InputSystem,
    CombatSystem,
    TurnSystem,
} from "@/lib/game/systems";
import { GameState } from "@/lib/game/state/GameState";
import { TurnFlow } from "../state";

/**
 * A simple scene demonstrating grid-based movement and combat.
 * - Click a unit to select it and see its movement range (blue) and attackable enemies (red).
 * - Click a highlighted tile to move, or an attackable enemy to attack.
 * - Units are represented as colored squares for now.
 */

const GRID_COLS = 10;
const GRID_ROWS = 10;
const CELL_SIZE = 80;

export class GridMovementScene extends Scene {
    private _canvas: HTMLCanvasElement;
    private _world: World | null = null;
    public input: InputSystem;
    public state = new GameState();
    public eventBus = new EventBus();
    public turnFlow = new TurnFlow();
    public turnSystem!: TurnSystem;

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
            { q: 2, r: 5 },
            {
                attack: 10,
                health: 100,
                movement: 5,
                name: "Warrior",
                defense: 5,
                attackRange: 1,
            },
            { color: "red" },
        );

        this._world.spawnUnit(
            { q: 5, r: 6 },
            {
                attack: 8,
                health: 80,
                movement: 2,
                name: "Skeleton",
                defense: 2,
                attackRange: 1,
            },
            { color: "purple" },
        );

        this._world.spawnUnit(
            { q: 5, r: 8 },
            {
                attack: 8,
                health: 80,
                movement: 2,
                name: "Skeleton",
                defense: 2,
                attackRange: 1,
            },
            { color: "purple" },
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
            ),
        );

        // CombatSystem not to be added to this.components because it has no lifecycle
        const combatSystem = new CombatSystem(this._world)

        this.turnFlow.add("action-phase", {
            onEnter: () => { this.state.transition("idle") }
        })

        this.turnFlow.add("declare-end-turn", {
            onEnter: () => { queueMicrotask(() => this.turnFlow.transition("quick-play")) }
        })

        this.turnFlow.add("quick-play", {
            onEnter: () => { queueMicrotask(() => this.turnFlow.transition("combat")) }
        })

        this.turnFlow.add("combat", {
            onEnter: () => {
                const world = this._world!

                for (const { attackerId, targetId } of this.state.pendingAttacks) {
                    const result = combatSystem.resolveAttack(attackerId, targetId)

                    if (!result) continue

                    if (result.defenderDied) {
                        this.state.pendingDeaths.push(targetId)
                    } else {
                        const defender = world.unitStats.get(targetId)!

                        world.unitStats.set(targetId, { ...defender, health: result.newDefenderHp })
                    }
                }

                this.state.pendingAttacks = []
                queueMicrotask(() => this.turnFlow.transition("post-combat"))
            }
        })

        this.turnFlow.add("post-combat", {
            onEnter: () => {
                const world = this._world!

                for (const id of this.state.pendingDeaths) {
                    world.removeUnit(id)
                }

                this.state.pendingDeaths = []
                this.turnSystem.endTurn()
            }
        })

        this.state.add("idle", {
            onEnter: () => {
                this.state.selectedEntity = null
                this.state.reachableTiles.clear()
                this.state.reachableAttackableTiles.clear()
                this.state.attackableEntities.clear()
                this.state.activePlayerId = this.turnSystem.activeId
            }
        })

        this.state.add("selected", {})
        
        this.state.add("awaiting-move", {
            onEnter: () => { this.state.attackableEntities.clear() }
        })
        
        this.state.add("moved", {})

        this.eventBus.on("turn:begin", () => {
            this.turnFlow.transition("action-phase")
        })

        this.turnSystem = new TurnSystem(
            [{ id: "player1" }, { id: "player2" }],
            this.eventBus,
            true
        )

        this.state.start("idle")
        this.turnFlow.start("action-phase")

        this.turnSystem.start("player1")

        this.components.add(
            new SelectionSystem(
                this._world,
                CELL_SIZE,
                this.state,
                this.input,
                tweens,
                combatSystem
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
