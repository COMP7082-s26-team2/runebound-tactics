import { EntityId } from "./EntityManager";

export class ComponentStore<T> {
    private _components: Map<EntityId, T> = new Map();

    set(entityId: EntityId, component: T): void {
        this._components.set(entityId, component);
    }

    remove(entityId: EntityId): void {
        this._components.delete(entityId);
    }

    get(entityId: EntityId): T | undefined {
        return this._components.get(entityId);
    }

    entries(): IterableIterator<[EntityId, T]> {
        return this._components.entries();
    }

    has(entityId: EntityId): boolean {
        return this._components.has(entityId);
    }

    clear(): void {
        this._components.clear();
    }

    size(): number {
        return this._components.size;
    }
}
