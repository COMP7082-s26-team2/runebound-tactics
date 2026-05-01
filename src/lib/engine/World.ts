import { Grid, GridCoord, GridPositionData } from "@/lib/engine/Grid";
import { ComponentManager } from "@/lib/engine/ComponentManager";
import { EntityId, EntityManager } from "./EntityManager";
import { ComponentStore } from "./ComponentStore";
import { AppearanceData } from "../render";
import { UnitStatsData } from "../game";

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
}
