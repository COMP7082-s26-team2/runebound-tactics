import { Scene, TweenManager, World, SquareGrid, AssetHandler, AnimationController, EventBus } from "@/lib/engine";
import {
    GridRenderSystem,
    UnitRenderSystem,
    MovementRangeSystem,
    SelectionSystem,
    InputSystem,
    CombatSystem,
    TurnSystem,
} from "@/lib/game/systems";
import { ClientGameState } from "@/lib/game/state/ClientGameState";
import { TurnFlow } from "../state";
import {
    ASSET_MANIFEST,
    UnitAnimationSystem,
    ANIMATION_FRAME_DURATIONS,
    DEFAULT_FRAME_DURATION,
} from "@/lib/game/assets";

/**
 * A simple scene demonstrating grid-based movement and combat.
 * - Click a unit to select it and see its movement range (blue) and attackable enemies (red).
 * - Click a highlighted tile to move, or an attackable enemy to attack.
 * - Units are represented as sprites or colored squares (fallback).
 */

const GRID_COLS = 10;
const GRID_ROWS = 10;
const CELL_SIZE = 80;

const PLAYER1_ID = "player1"
const PLAYER2_ID = "player2"

export class GridMovementScene extends Scene {
    private _canvas: HTMLCanvasElement;
    private _world: World | null = null;
    public input: InputSystem;
    public state = new ClientGameState();
    public eventBus = new EventBus();
    public turnFlow = new TurnFlow();
    public turnSystem!: TurnSystem;
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
            { q: 2, r: 5 },
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
            PLAYER1_ID
        );
        this._world.spawnUnit(
            { q: 3, r: 3 },
            {
                attack: 10,
                health: 100,
                movement: 6,
                name: "Griffin",
                defense: 5,
                attackRange: 1,
            },
            {
                assetKey: "tilemap:entity:castle:griffin",
                animationState: "idle",
                color: "red",
            },
            PLAYER1_ID
        );

        this._world.spawnUnit(
            { q: 5, r: 6 },
            {
                attack: 8,
                health: 80,
                movement: 5,
                name: "Death Knight",
                defense: 2,
                attackRange: 1,
            },
            {
                assetKey: "tilemap:entity:necropolis:death_knight",
                animationState: "idle",
                facingLeft: true,
                color: "purple",
            },
            PLAYER2_ID
        );
        this._world.spawnUnit(
            { q: 7, r: 6 },
            {
                attack: 8,
                health: 80,
                movement: 5,
                name: "Ghost",
                defense: 2,
                attackRange: 1,
            },
            {
                assetKey: "tilemap:entity:necropolis:ghost",
                animationState: "idle",
                facingLeft: true,
                color: "purple",
            },
            PLAYER2_ID
        );
        this._world.spawnUnit(
            { q: 7, r: 7 },
            {
                attack: 8,
                health: 80,
                movement: 5,
                name: "Skeleton",
                defense: 2,
                attackRange: 1,
            },
            {
                assetKey: "tilemap:entity:necropolis:skeleton",
                animationState: "idle",
                facingLeft: true,
                color: "purple",
            },
            PLAYER2_ID
        );
        this._world.spawnUnit(
            { q: 6, r: 7 },
            {
                attack: 8,
                health: 80,
                movement: 3,
                name: "Zombie",
                defense: 2,
                attackRange: 1,
            },
            {
                assetKey: "tilemap:entity:necropolis:zombie",
                animationState: "idle",
                facingLeft: true,
                color: "purple",
            },
            PLAYER2_ID
        );

        const tweens = new TweenManager();
        const animationController = new AnimationController(
            (state) => ANIMATION_FRAME_DURATIONS[state] ?? DEFAULT_FRAME_DURATION,
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

                console.log(`[combat] resolving ${this.state.pendingAttacks.length} attack(s)`)

                for (const { attackerId, targetId } of this.state.pendingAttacks) {
                    const result = combatSystem.resolveAttack(attackerId, targetId)

                    if (!result) continue

                    const attackerName = world.unitStats.get(attackerId)?.name ?? attackerId
                    const defenderName = world.unitStats.get(targetId)?.name ?? targetId
                    console.log(`[combat] ${attackerName} → ${defenderName}: ${result.damage} dmg | HP ${world.unitStats.get(targetId)?.health} → ${result.newDefenderHp}${result.defenderDied ? " (died)" : ""}`)

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
            [{ id: PLAYER1_ID }, { id: PLAYER2_ID }],
            this.eventBus,
            true
        )

        this.state.start("idle")
        this.turnFlow.start("action-phase")

        this.turnSystem.start(PLAYER1_ID)

        for (const [, entityId] of this._world.occupancyMap.entries()) {
            const assetKey = this._world.unitAppearance.get(entityId)?.assetKey;
            const frameCount = assetKey
                ? (ASSET_MANIFEST[assetKey]?.spriteSheet?.frameCount ?? 1)
                : 1;
            animationController.register(entityId, "idle", frameCount);
        }

        this.components.add(tweens);
        this.components.add(
            new SelectionSystem(
                this._world,
                CELL_SIZE,
                this.state,
                this.input,
                tweens,
                combatSystem,
                this.turnFlow,
                0.37
            ),
        );
        this.components.add(animationController);
        this.components.add(new UnitAnimationSystem(this._world, tweens, animationController));
        this.components.add(
            new UnitRenderSystem(
                this._world,
                GRID_COLS,
                GRID_ROWS,
                CELL_SIZE,
                tweens,
                this._assetHandler,
                animationController,
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

    endTurn(): void {
        if (this.turnFlow.current === "action-phase") {
            this.turnFlow.transition("declare-end-turn")
        }
    }

    destroy(): void {
        this._world = null;
    }
}
