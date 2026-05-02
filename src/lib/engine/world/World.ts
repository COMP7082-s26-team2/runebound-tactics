import { Grid, GridCoord } from "@/lib/engine/grid/Grid";
import { ComponentManager } from "@/lib/engine/core/ComponentManager";
import { EntityId, EntityManager } from "@/lib/engine/core/ecs/EntityManager";
import { ComponentStore } from "@/lib/engine/core/ecs/ComponentStore";
import { AppearanceData } from "@/lib/game/components/AppearanceData";
import { UnitStatsData } from "@/lib/game/components/UnitStatsData";
import { GridPositionData } from "@/lib/game/components/GridPositionData";

export type OccupancyMap = Map<string, EntityId>;

export function cellKey(coord: GridCoord): string {
    return `${coord.q},${coord.r}`;
}

export class World {
    public components = new ComponentManager();
    public grid: Grid;

    public entityManager: EntityManager = new EntityManager();
    public occupancyMap: OccupancyMap = new Map();

    public gridPositions = new ComponentStore<GridPositionData>();
    public unitStats = new ComponentStore<UnitStatsData>();
    public unitAppearance = new ComponentStore<AppearanceData>();

    constructor(grid: Grid) {
        this.grid = grid;
    }

    spawnUnit(
        coord: GridCoord,
        stats: UnitStatsData,
        appearance: AppearanceData,
    ): EntityId {
        const entityId = this.entityManager.createEntity();
        this.gridPositions.set(entityId, coord);
        this.unitStats.set(entityId, stats);
        this.unitAppearance.set(entityId, appearance);
        this.occupancyMap.set(cellKey(coord), entityId);
        return entityId;
    }

    moveUnit(entityId: EntityId, newCoord: GridCoord): void {
        const oldCoord = this.gridPositions.get(entityId);
        if (!oldCoord) {
            throw new Error(`Entity ${entityId} does not have a grid position`);
        }
        this.occupancyMap.delete(cellKey(oldCoord));
        this.gridPositions.set(entityId, newCoord);
        this.occupancyMap.set(cellKey(newCoord), entityId);
    }

    removeUnit(entityId: EntityId): void {
        const coord = this.gridPositions.get(entityId);
        if (coord) this.occupancyMap.delete(cellKey(coord));
        this.gridPositions.remove(entityId);
        this.unitStats.remove(entityId);
        this.unitAppearance.remove(entityId);
        this.entityManager.removeEntity(entityId);
    }
    
}
