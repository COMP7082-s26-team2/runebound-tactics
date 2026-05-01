
export class ComponentStore<T> {
    private components: Map<number, T> = new Map();

    add(entityId: number, component: T): void {
        this.components.set(entityId, component);
    }

    remove(entityId: number): void {
        this.components.delete(entityId);
    }

    get(entityId: number): T | undefined {
        return this.components.get(entityId);
    }

    entries(): IterableIterator<[number, T]> {
        return this.components.entries();
    }

    has(entityId: number): boolean {
        return this.components.has(entityId);
    }

    clear(): void {
        this.components.clear();
    }

    size(): number {
        return this.components.size;
    }

}