import { EntityId } from "./EntityManager";

export class ComponentStore<T> {
    private components: Map<number, T> = new Map();

    set(entityId: EntityId, component: T): void {
        this.components.set(entityId, component);
    }

    remove(entityId: EntityId): void {
        this.components.delete(entityId);
    }

    get(entityId: EntityId): T | undefined {
        return this.components.get(entityId);
    }

    entries(): IterableIterator<[EntityId, T]> {
        return this.components.entries();
    }

    has(entityId: EntityId): boolean {
        return this.components.has(entityId);
    }

    clear(): void {
        this.components.clear();
    }

    size(): number {
        return this.components.size;
    }
}
