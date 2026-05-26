import { getStateCallbacks } from "@colyseus/sdk";
import type { Room } from "@colyseus/sdk";
import type { GameState, GameUnit } from "@runebound-tactics/shared";
import {
    Scene,
    TweenManager,
    World,
    SquareGrid,
    AssetHandler,
    AnimationController,
    EntityId,
    Vector2D,
    GridCoord,
} from "@/lib/engine";
import type { AppearanceData, UnitStatsData } from "@/lib/game/components";
import {
    GridRenderSystem,
    UnitRenderSystem,
    MovementRangeSystem,
    InputSystem,
    CombatSystem,
    MultiplayerSelectionSystem,
} from "@/lib/game/systems";
import { ClientGameState, TurnFlow } from "@/lib/game/state";
import {
    ASSET_MANIFEST,
    UnitAnimationSystem,
    ANIMATION_FRAME_DURATIONS,
    DEFAULT_FRAME_DURATION,
} from "@/lib/game/assets";
import { CLIENT_UNIT_STATS } from "@/lib/game/data";
import { computePath } from "@/lib/game/utils";

const GRID_COLS = 10;
const GRID_ROWS = 10;
const CELL_SIZE = 80;
const STEP_DURATION = 0.37;
const PLAYER_COLORS = ["#e04040", "#4080ff", "#40c060", "#e0c040"];

export class MultiplayerGameScene extends Scene {
    private _world: World | null = null;
    private _clientState!: ClientGameState;
    private _input!: InputSystem;
    private _tweens!: TweenManager;
    private _animationController!: AnimationController;
    private _unitIdToEntityId = new Map<string, EntityId>();
    private _entityIdToUnitId = new Map<EntityId, string>();
    private _moveQueue: Array<{ entityId: EntityId; newCoord: GridCoord; waypoints: Vector2D[] }> = [];
    private _isAnimating = false;

    get isMyTurn(): boolean {
        return this.room.state.currentTurnId === this.mySessionId;
    }

    constructor(
        private _canvas: HTMLCanvasElement,
        public room: Room<GameState>,
        public mySessionId: string,
        private _assetHandler?: AssetHandler,
    ) {
        super();
    }

    init(): void {
        const grid = new SquareGrid(CELL_SIZE);
        this._world = new World(grid);
        this._tweens = new TweenManager();
        this._animationController = new AnimationController(
            (state) => ANIMATION_FRAME_DURATIONS[state] ?? DEFAULT_FRAME_DURATION,
        );
        this._input = new InputSystem(this._canvas);

        const combatSystem = new CombatSystem(this._world);

        this._clientState = new ClientGameState();
        this._clientState.add("idle", {
            onEnter: () => {
                this._clientState.selectedEntity = null;
                this._clientState.reachableTiles.clear();
                this._clientState.reachableAttackableTiles.clear();
                this._clientState.attackableEntities.clear();
                this._clientState.activePlayerId = this.room.state.currentTurnId;
            },
        });
        this._clientState.add("selected", {});
        this._clientState.add("awaiting-move", {
            onEnter: () => { this._clientState.attackableEntities.clear(); },
        });
        this._clientState.add("moved", {});

        const turnFlow = new TurnFlow();
        turnFlow.add("action-phase", {});
        turnFlow.start("action-phase");

        const $ = getStateCallbacks(this.room);

        $(this.room.state.units).onAdd((unit) => {
            this._spawnEcsUnit(unit);

            $(unit).onChange(() => {
                const entityId = this._unitIdToEntityId.get(unit.unitId);
                if (entityId === undefined || !this._world) return;
                const world = this._world;

                const old = world.gridPositions.get(entityId);
                if (old && (old.q !== unit.x || old.r !== unit.y)) {
                    const newCoord = { q: unit.x, r: unit.y };

                    const path = computePath(world, entityId, newCoord);
                    const currentVisualPos = this._tweens.getPosition(
                        entityId,
                        world.grid.gridToWorld(old),
                    );

                    const waypoints = [
                        currentVisualPos,
                        ...path.slice(1).map((c) => world.grid.gridToWorld(c)),
                    ];

                    // world.moveUnit deferred to _drainQueue — prevents snap to destination
                    this._enqueueMoveAnimation(entityId, newCoord, waypoints);
                }

                const stats = world.unitStats.get(entityId);
                if (stats && stats.health !== unit.hp) {
                    world.unitStats.set(entityId, { ...stats, health: unit.hp });
                }
            });
        }, true);

        $(this.room.state.units).onRemove((unit) => {
            const entityId = this._unitIdToEntityId.get(unit.unitId);
            if (entityId === undefined || !this._world) return;
            this._world.removeUnit(entityId);
            this._unitIdToEntityId.delete(unit.unitId);
            this._entityIdToUnitId.delete(entityId);
        });

        $(this.room.state).listen("currentTurnId", () => {
            this._clientState.reset();
            this._clientState.start("idle");
        });

        // listen fires immediately if currentTurnId is already set; guard against double-start
        if (!this._clientState.started) {
            this._clientState.start("idle");
        }

        this.room.onMessage("game_over", ({ winnerId, displayName }) => {
            console.log(`[MultiplayerGameScene] Game over — winner: ${displayName} (${winnerId})`);
        });

        const selectionSystem = new MultiplayerSelectionSystem(
            this._world,
            CELL_SIZE,
            this._clientState,
            this._input,
            this._tweens,
            combatSystem,
            turnFlow,
            this.room,
            this._entityIdToUnitId,
            this.mySessionId,
            STEP_DURATION,
        );

        this.components.add(this._tweens);
        this.components.add(selectionSystem);
        this.components.add(this._animationController);
        this.components.add(new UnitAnimationSystem(this._world, this._tweens, this._animationController));
        this.components.add(
            new UnitRenderSystem(
                this._world,
                GRID_COLS,
                GRID_ROWS,
                CELL_SIZE,
                this._tweens,
                this._assetHandler,
                this._animationController,
            ),
        );
        this.components.add(new GridRenderSystem(this._world, GRID_COLS, GRID_ROWS, CELL_SIZE));
        this.components.add(new MovementRangeSystem(this._world, CELL_SIZE, this._clientState));
        this.components.add(this._input);
    }

    override update(dt: number): void {
        if (this.isMyTurn && this._input.isKeyJustPressed("KeyE")) {
            this.room.send("end_turn");
        }
        super.update(dt);
    }

    destroy(): void {
        this._world = null;
    }

    private _enqueueMoveAnimation(entityId: EntityId, newCoord: GridCoord, waypoints: Vector2D[]): void {
        this._moveQueue.push({ entityId, newCoord, waypoints });
        this._drainQueue();
    }

    private _drainQueue(): void {
        if (this._isAnimating || this._moveQueue.length === 0) return;
        let entry = this._moveQueue.shift();
        while (entry && !this._world?.gridPositions.has(entry.entityId)) {
            entry = this._moveQueue.shift();
        }
        if (!entry) return;
        this._isAnimating = true;
        this._world!.moveUnit(entry.entityId, entry.newCoord);
        this._tweens.startPath(entry.entityId, entry.waypoints, STEP_DURATION, () => {
            this._isAnimating = false;
            this._drainQueue();
        });
    }

    private _spawnEcsUnit(unit: GameUnit): void {
        if (!this._world) return;

        const clientStats = CLIENT_UNIT_STATS[unit.unitType];
        const faction = this.room.state.players.get(unit.ownerId)?.faction || "castle";

        const stats: UnitStatsData = {
            name: clientStats?.name ?? unit.unitType,
            health: unit.hp,
            movement: clientStats?.movement ?? 3,
            attack: clientStats?.attack ?? 5,
            defense: clientStats?.defense ?? 2,
            attackRange: clientStats?.attackRange ?? 1,
        };

        const isMine = unit.ownerId === this.mySessionId;
        const outlineColor = isMine
            ? PLAYER_COLORS[0]!
            : PLAYER_COLORS[1]!;

        const appearance: AppearanceData = {
            assetKey: `tilemap:entity:${faction}:${unit.unitType}`,
            animationState: "idle",
            color: faction === "castle" ? "red" : "purple",
            facingLeft: faction === "necropolis",
            outlineColor,
        };

        const entityId = this._world.spawnUnit(
            { q: unit.x, r: unit.y },
            stats,
            appearance,
            unit.ownerId,
        );

        this._unitIdToEntityId.set(unit.unitId, entityId);
        this._entityIdToUnitId.set(entityId, unit.unitId);

        const frameCount =
            ASSET_MANIFEST[appearance.assetKey]?.spriteSheet?.frameCount ?? 1;
        this._animationController.register(entityId, "idle", frameCount);
    }
}
