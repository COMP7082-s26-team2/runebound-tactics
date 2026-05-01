export type EntityId = number;

export class EntityManager {

    private nextId: EntityId = 1;
    private entities: Set<EntityId> = new Set();

    createEntity(): EntityId {
        const id = this.nextId++;
        this.entities.add(id);
        return id;
    }

    removeEntity(id: EntityId): void {
        this.entities.delete(id);
    }

    hasEntity(id: EntityId): boolean {
        return this.entities.has(id);
    }

    getEntities(): Set<EntityId> {
        return this.entities;
    }
}