import {
    GameComponent,
    EntityId,
    GridCoord,
    TweenManager,
    Vector2D,
    World,
    cellKey,
} from "@/lib/engine";
import { GameState } from "@/lib/game/state";
import { InputSystem } from "@/lib/game/systems";

const STEP_DURATION = 0.15; // seconds per grid cell

export class SelectionSystem implements GameComponent {
    constructor(
        private _world: World,
        private _cellSize: number,
        private _state: GameState,
        private _input: InputSystem,
        private _tweens: TweenManager,
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

    private _handleIdleClick(occupant: EntityId | null): void {
        // TESTING
        console.log("[_handleIdleClick]");
        
        if (occupant === null) return;
        this._select(occupant);
    }

    private _handleSelectedClick(
        coord: GridCoord,
        key: string,
        occupant: EntityId | null,
    ): void {
        // // TESTING
        // console.log("[_handleSelectedClick]");
        
        // attack
        if (occupant !== null && this._state.attackableEntities.has(occupant)) {
            // TESTING
            console.log("[_handleSelectedClick] Attack");
            this._attack(this._state.selectedEntity!, occupant);
            this._computeReachable(this._state.selectedEntity!);
            this._state.attackableEntities.clear();
            this._state.phase = "awaiting-move";
            return;
        }
        
        // move
        if (this._state.reachableTiles.has(key)) {
            // TESTING
            console.log("[_handleSelectedClick] Move");
            this._moveUnit(this._state.selectedEntity!, coord);
            this._deselect();
            return;
        }
        
        // TESTING
        console.log("[_handleSelectedClick] Default deselect");
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
        this._state.phase = "selected";
        this._computeReachable(entityId);
        this._computeAttackable(entityId);
    }

    private _moveUnit(entityId: EntityId, targetCoord: GridCoord): void {
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

        this._tweens.startPath(entityId, waypoints, STEP_DURATION);
    }

    // BFS to find the grid path to target
    private _computePath(entityId: EntityId, target: GridCoord): GridCoord[] {
        const start = this._world.gridPositions.get(entityId);
        const stats = this._world.unitStats.get(entityId);
        if (!start || !stats) return [];

        const targetKey = cellKey(target);
        const parentMap = new Map<string, GridCoord | null>();
        const queue: Array<{ coord: GridCoord; steps: number }> = [
            { coord: start, steps: 0 },
        ];
        parentMap.set(cellKey(start), null);

        outer: while (queue.length > 0) {
            const { coord, steps } = queue.shift()!;
            if (steps >= stats.movement) continue;

            for (const neighbor of this._world.grid.getNeighbors(coord)) {
                const key = cellKey(neighbor);
                if (parentMap.has(key)) continue;
                if (this._world.occupancyMap.has(key)) continue;
                parentMap.set(key, coord);
                if (key === targetKey) break outer;
                queue.push({ coord: neighbor, steps: steps + 1 });
            }
        }

        // reconstruct path from parent pointers
        const path: GridCoord[] = [];
        let current: GridCoord | null | undefined = target;
        while (current != null) {
            path.unshift(current);
            current = parentMap.get(cellKey(current));
        }

        return path.length > 0 ? path : [start, target];
    }

    private _deselect(): void {
        this._state.phase = "idle";
        this._state.selectedEntity = null;
        this._state.reachableTiles.clear();
        this._state.attackableEntities.clear();
    }

    private _computeReachable(entityId: EntityId): void {
        const stats = this._world.unitStats.get(entityId);
        const start = this._world.gridPositions.get(entityId);
        if (!stats || !start) return;

        // filter for other entities (treat them all as attackble entities)
        const attackableEntities = new Set(
            [...this._world.unitStats.entries()]
                .filter(([candidateId]) => candidateId !== entityId)
                .map(([candidateId]) => candidateId)
        )
        const reachableAttackableTiles = new Map<string, number>()

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
                
                // if (this._world.occupancyMap.has(key)) continue;
                const curNeighborOccupant = this._world.occupancyMap.get(key)

                // TESTING
                console.log("occupant: ", curNeighborOccupant);
                
                if (coord !== start) {
                // if (curNeighborOccupant) {
                    // fetch neighbors of tile and check for occupants for forEach
                    for (const tile of this._world.grid.getNeighbors(neighbor)) {
                        const neighborKey = cellKey(tile);
                        if (this._world.occupancyMap.get(neighborKey)) 
                        reachableAttackableTiles.set(key, steps + 1);
                    }
                    // continue
                // }
                }

                // if (curNeighborOccupant && attackableEntities.has(curNeighborOccupant)) {
                // if (curNeighborOccupant) {
                //     this._world.grid.getNeighbors(coord)
                //         .forEach(neighbor => {
                //         })
                //     continue;
                // }

                visited.set(key, steps + 1);
                queue.push({ coord: neighbor, steps: steps + 1 });
            }
        }

        // TESTING
        console.log("attack tiles: ", reachableAttackableTiles);

        visited.delete(cellKey(start));
        this._state.reachableTiles = new Set(visited.keys());
        this._state.reachableAttackableTiles = new Set(reachableAttackableTiles.keys())
    }

    // private _computeReachableAttackable(entityId: EntityId): void {
    //     const stats = this._world.unitStats.get(entityId)
    //     const pos = this._world.gridPositions.get(entityId)

    //     if (!stats || !pos) return

    //     this._state.reachableAttackableTiles.clear()

    //     for (const [candidateId] of this._world.unitStats.entries()) {
    //         if (candidateId === entityId) continue

    //         const candidatePpos = this._world.gridPositions.get(candidateId)

    //         if (!candidatePpos) continue

    //         if (this._world.grid.distance(pos, candidatePpos)) {}
    //     }
    // }

    private _computeAttackable(entityId: EntityId): void {
        const stats = this._world.unitStats.get(entityId);
        const pos = this._world.gridPositions.get(entityId);
        if (!stats || !pos) return;

        this._state.attackableEntities.clear();

        for (const [candidateId] of this._world.unitStats.entries()) {
            if (candidateId === entityId) continue;
            const candidatePos = this._world.gridPositions.get(candidateId);
            if (!candidatePos) continue;
            if (
                this._world.grid.distance(pos, candidatePos) <=
                stats.attackRange
            ) {
                this._state.attackableEntities.add(candidateId);
            }
        }
    }

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
