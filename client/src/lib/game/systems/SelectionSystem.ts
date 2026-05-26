import {
    GameComponent,
    EntityId,
    GridCoord,
    TweenManager,
    Vector2D,
    World,
    cellKey,
} from "@/lib/engine";
import { ClientGameState, TurnFlow } from "@/lib/game/state";
import { CombatSystem, InputSystem } from "@/lib/game/systems";
import { computePath } from "@/lib/game/utils";

const DEFAULT_STEP_DURATION = 0.15;

export class SelectionSystem implements GameComponent {
    constructor(
        protected _world: World,
        protected _cellSize: number,
        protected _state: ClientGameState,
        protected _input: InputSystem,
        protected _tweens: TweenManager,
        private _combat: CombatSystem,
        private _turnFlow: TurnFlow,
        protected _stepDuration: number = DEFAULT_STEP_DURATION,
    ) { }

    update(_dt: number): void {
        if (this._turnFlow.current !== "action-phase") return;
        if (!this._input.isMouseButtonJustPressed(0)) return;

        const coord: GridCoord = {
            q: Math.floor(this._input.mouseX / this._cellSize),
            r: Math.floor(this._input.mouseY / this._cellSize),
        };
        const key = cellKey(coord);
        const occupant = this._world.occupancyMap.get(key) ?? null;

        switch (this._state.phase) {
            case "idle":
                this._handleIdleClick(occupant);
                break;
            case "selected":
                this._handleSelectedClick(coord, key, occupant);
                break;
            case "awaiting-move":
                this._handleAwaitingMoveClick(coord, key);
                break;
            case "moved":
                this._handleMovedClick(occupant);
                break;
        }
    }

    private _handleIdleClick(occupant: EntityId | null): void {
        // TESTING
        console.log("[_handleIdleClick]");
        
        if (occupant === null) return;
        
        if (this._world.unitOwnership.get(occupant) !== this._state.activePlayerId) return;

        this._select(occupant);
    }

    private _handleSelectedClick(
        coord: GridCoord,
        key: string,
        occupant: EntityId | null,
    ): void {
        // attack in place
        if (occupant !== null && this._state.attackableEntities.has(occupant)) {
            this._declareAttack(this._state.selectedEntity!, occupant);
            this._computeReachable(this._state.selectedEntity!);
            this._state.attackableEntities.clear();
            this._state.transition("awaiting-move");
            return;
        }

        // move to attack-position tile, then await attack
        if (this._state.reachableAttackableTiles.has(key)) {
            const entityId = this._state.selectedEntity!;
            this._moveUnit(entityId, coord);
            this._state.reachableTiles.clear();
            this._state.reachableAttackableTiles.clear();
            // this._computeAttackable(entityId);
            this._state.attackableEntities = this._combat.computeAttackable(entityId)
            this._state.transition("moved");
            return;
        }

        // move and end turn
        if (this._state.reachableTiles.has(key)) {
            this._moveUnit(this._state.selectedEntity!, coord);
            this._deselect();
            return;
        }

        this._deselect();
    }

    private _handleMovedClick(occupant: EntityId | null): void {
        if (occupant !== null && this._state.attackableEntities.has(occupant)) {
            this._declareAttack(this._state.selectedEntity!, occupant);
        }
        this._deselect();
    }

    private _handleAwaitingMoveClick(coord: GridCoord, key: string): void {
        // move then end turn
        if (this._state.reachableTiles.has(key)) {
            this._moveUnit(this._state.selectedEntity!, coord);
        }
        this._deselect();
    }

    private _select(entityId: EntityId): void {
        this._state.selectedEntity = entityId;
        this._state.transition("selected");
        this._computeReachable(entityId);
        // this._computeAttackable(entityId);
        this._state.attackableEntities = this._combat.computeAttackable(entityId)
    }

    protected _moveUnit(entityId: EntityId, targetCoord: GridCoord): void {
        const path = this._computePath(entityId, targetCoord);

        // sample visual pos so an interrupted tween starts from there
        const oldCoord = this._world.gridPositions.get(entityId)!;
        const currentVisualPos = this._tweens.getPosition(
            entityId,
            this._world.grid.gridToWorld(oldCoord),
        );

        this._world.moveUnit(entityId, targetCoord);

        // convert grid path to pixel waypoints
        const waypoints: Vector2D[] = [
            currentVisualPos,
            ...path.slice(1).map((c) => this._world.grid.gridToWorld(c)),
        ];

        this._tweens.startPath(entityId, waypoints, this._stepDuration);
    }

    private _computePath(entityId: EntityId, target: GridCoord): GridCoord[] {
        const stats = this._world.unitStats.get(entityId);
        if (!stats) return [];
        return computePath(this._world, entityId, target, stats.movement);
    }

    private _deselect(): void {
        this._state.transition("idle");
        this._state.selectedEntity = null;
        this._state.reachableTiles.clear();
        this._state.reachableAttackableTiles.clear();
        this._state.attackableEntities.clear();
    }

    private _computeReachable(entityId: EntityId): void {
        const stats = this._world.unitStats.get(entityId);
        const start = this._world.gridPositions.get(entityId);
        if (!stats || !start) return;

        // BFS over unoccupied tiles within movement range
        const visited = new Map<string, number>();
        const queue: Array<{ coord: GridCoord; steps: number }> = [
            { coord: start, steps: 0 },
        ];
        visited.set(cellKey(start), 0);

        while (queue.length > 0) {
            const { coord, steps } = queue.shift()!;
            if (steps >= stats.movement) continue;

            for (const neighbor of this._world.grid.getNeighbors(coord)) {
                const key = cellKey(neighbor);
                if (visited.has(key)) continue;
                if (this._world.occupancyMap.has(key)) continue;
                visited.set(key, steps + 1);
                queue.push({ coord: neighbor, steps: steps + 1 });
            }
        }

        visited.delete(cellKey(start));
        this._state.reachableTiles = new Set(visited.keys());

        // Green tiles: reachable empty tiles that are adjacent to an enemy
        const reachableAttackableTiles = new Set<string>();
        for (const key of this._state.reachableTiles) {
            const [q, r] = key.split(",").map(Number);
            for (const neighbor of this._world.grid.getNeighbors({ q, r })) {
                const occupant = this._world.occupancyMap.get(cellKey(neighbor));
                if (occupant !== undefined && occupant !== entityId) {
                    reachableAttackableTiles.add(key);
                    break;
                }
            }
        }
        this._state.reachableAttackableTiles = reachableAttackableTiles;
    }

    protected _declareAttack(attackerId: EntityId, targetId: EntityId): void {
        this._state.pendingAttacks.push({ attackerId, targetId });
    }
}
