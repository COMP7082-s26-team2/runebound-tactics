import { Grid, GridCoord } from "@/lib/engine/grid";
import { ComponentManager } from "@/lib/engine/core";
import { EntityId, EntityManager } from "@/lib/engine/core/ecs/EntityManager";
import { ComponentStore } from "@/lib/engine/core/ecs/ComponentStore";
import {
    AppearanceData,
    UnitStatsData,
    GridPositionData,
} from "@/lib/game/components";

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
    public unitOwnership = new ComponentStore<string>();

    // Bidirectional bindings between server-authoritative unit IDs (strings)
    // and local entity IDs (numbers). Optional — only populated for units
    // created via the multiplayer reconciler. Singleplayer-spawned units
    // ignore these maps entirely.
    private _serverIdToEntity = new Map<string, EntityId>();
    private _entityToServerId = new Map<EntityId, string>();

    constructor(grid: Grid) {
        this.grid = grid;
    }

    spawnUnit(
        coord: GridCoord,
        stats: UnitStatsData,
        appearance: AppearanceData,
        owner?: string,
        serverId?: string,
    ): EntityId {
        const entityId = this.entityManager.createEntity();
        this.gridPositions.set(entityId, coord);
        this.unitStats.set(entityId, stats);
        this.unitAppearance.set(entityId, appearance);
        this.occupancyMap.set(cellKey(coord), entityId);

        if (owner !== undefined) this.unitOwnership.set(entityId, owner);

        if (serverId !== undefined) {
            this._serverIdToEntity.set(serverId, entityId);
            this._entityToServerId.set(entityId, serverId);
        }

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
        this.unitOwnership.remove(entityId);

        const serverId = this._entityToServerId.get(entityId);
        if (serverId !== undefined) {
            this._serverIdToEntity.delete(serverId);
            this._entityToServerId.delete(entityId);
        }

        this.entityManager.removeEntity(entityId);
    }

    getEntityByServerId(serverId: string): EntityId | undefined {
        return this._serverIdToEntity.get(serverId);
    }

    getServerIdByEntity(entityId: EntityId): string | undefined {
        return this._entityToServerId.get(entityId);
    }

    getAllServerIds(): string[] {
        return [...this._serverIdToEntity.keys()];
    }
}
