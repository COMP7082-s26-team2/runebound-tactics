import { GameComponent } from "@/lib/engine/core/GameComponent";
import { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import { GridCoord } from "@/lib/engine/grid/Grid";
import { World, cellKey } from "@/lib/engine/world/World";
import { GameState } from "@/lib/game/state/GameState";
import { InputSystem } from "@/lib/game/systems/InputSystem";

export class SelectionSystem implements GameComponent {
    constructor(
        private _world: World,
        private _cellSize: number,
        private _state: GameState,
        private _input: InputSystem,
    ) {}

    update(_dt: number): void {
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
        }
    }

    // -------------------------------------------------------------------------
    // State handlers
    // -------------------------------------------------------------------------

    private _handleIdleClick(occupant: EntityId | null): void {
        if (occupant === null) return;
        const stats = this._world.unitStats.get(occupant);
        if (stats?.team !== "player") return;
        this._select(occupant);
    }

    private _handleSelectedClick(
        coord: GridCoord,
        key: string,
        occupant: EntityId | null,
    ): void {
        // Clicking an attackable enemy → attack, then enter awaiting-move
        if (occupant !== null && this._state.attackableEntities.has(occupant)) {
            this._attack(this._state.selectedEntity!, occupant);
            this._computeReachable(this._state.selectedEntity!);
            this._state.attackableEntities.clear();
            this._state.phase = "awaiting-move";
            return;
        }

        // Clicking a reachable tile → move and end turn
        if (this._state.reachableTiles.has(key)) {
            this._world.moveUnit(this._state.selectedEntity!, coord);
            this._deselect();
            return;
        }

        // Clicking anywhere else → deselect
        this._deselect();
    }

    private _handleAwaitingMoveClick(coord: GridCoord, key: string): void {
        // Unit has already attacked — only movement left, then turn ends
        if (this._state.reachableTiles.has(key)) {
            this._world.moveUnit(this._state.selectedEntity!, coord);
        }
        this._deselect();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private _select(entityId: EntityId): void {
        this._state.selectedEntity = entityId;
        this._state.phase = "selected";
        this._computeReachable(entityId);
        this._computeAttackable(entityId);
    }

    private _deselect(): void {
        this._state.phase = "idle";
        this._state.selectedEntity = null;
        this._state.reachableTiles.clear();
        this._state.attackableEntities.clear();
    }

    /** BFS flood-fill up to stats.movement steps, skipping occupied cells. */
    private _computeReachable(entityId: EntityId): void {
        const stats = this._world.unitStats.get(entityId);
        const start = this._world.gridPositions.get(entityId);
        if (!stats || !start) return;

        const visited = new Map<string, number>(); // cellKey → steps used
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
                // blocked by any unit (allies and enemies alike)
                if (this._world.occupancyMap.has(key)) continue;
                visited.set(key, steps + 1);
                queue.push({ coord: neighbor, steps: steps + 1 });
            }
        }

        visited.delete(cellKey(start)); // can't "move" to own tile
        this._state.reachableTiles = new Set(visited.keys());
    }

    /** Mark all enemies within attackRange of the selected entity. */
    private _computeAttackable(entityId: EntityId): void {
        const stats = this._world.unitStats.get(entityId);
        const pos = this._world.gridPositions.get(entityId);
        if (!stats || !pos) return;

        this._state.attackableEntities.clear();

        for (const [candidateId] of this._world.unitStats.entries()) {
            if (candidateId === entityId) continue;
            const candidateStats = this._world.unitStats.get(candidateId);
            if (!candidateStats || candidateStats.team === stats.team) continue;
            const candidatePos = this._world.gridPositions.get(candidateId);
            if (!candidatePos) continue;
            if (this._world.grid.distance(pos, candidatePos) <= stats.attackRange) {
                this._state.attackableEntities.add(candidateId);
            }
        }
    }

    /** Apply damage and remove the target if health drops to 0. */
    private _attack(attackerId: EntityId, targetId: EntityId): void {
        const atkStats = this._world.unitStats.get(attackerId);
        const defStats = this._world.unitStats.get(targetId);
        if (!atkStats || !defStats) return;

        const damage = Math.max(0, atkStats.attack - defStats.defense);
        const newHp = defStats.health - damage;

        if (newHp <= 0) {
            this._world.removeUnit(targetId);
        } else {
            this._world.unitStats.set(targetId, { ...defStats, health: newHp });
        }
    }
}
