export type EntityId = number;

export class EntityManager {
    private _nextId: EntityId = 1;
    private _entities: Set<EntityId> = new Set();

    createEntity(): EntityId {
        const id = this._nextId++;
        this._entities.add(id);
        return id;
    }

    removeEntity(id: EntityId): void {
        this._entities.delete(id);
    }

    hasEntity(id: EntityId): boolean {
        return this._entities.has(id);
    }

    getEntities(): Set<EntityId> {
        return this._entities;
    }
}
