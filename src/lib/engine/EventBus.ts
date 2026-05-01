type EventBusSubFunction = (
    event: string,
    callback: (...args: unknown[]) => unknown,
) => void;

class EventBus {
    private listeners = new Map<string, Set<(...args: unknown[]) => unknown>>();

    on: EventBusSubFunction = (event, callback) => {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        this.listeners.get(event)?.add(callback);

        return () => this.off(event, callback);
    };

    off: EventBusSubFunction = (event, callback) => {
        const set = this.listeners.get(event);

        if (!set) return;

        set.delete(callback);

        if (set.size === 0) {
            this.listeners.delete(event);
        }
    };

    once: EventBusSubFunction = (event, callback) => {
        const wrapper = (data: unknown) => {
            this.off(event, wrapper);
            callback(data);
        };

        return this.on(event, wrapper);
    };

    emit = (event: string, data: unknown) => {
        const set = this.listeners.get(event);

        if (!set) return;

        for (const callback of [...set]) {
            callback(data);
        }
    };

    hasListeners = (event: string) => {
        const set = this.listeners.get(event);

        return set != null && set.size > 0;
    };
}

export { EventBus };
