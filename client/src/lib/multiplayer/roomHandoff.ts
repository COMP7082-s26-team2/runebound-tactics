import type { Room } from "@colyseus/sdk";

const cache = new Map<string, Room<unknown, unknown>>();

export function stashHandoff(room: Room<unknown, unknown>): void {
    cache.set(room.roomId, room);
}

export function peekHandoff<T>(roomId: string): Room<unknown, T> | null {
    return (cache.get(roomId) as Room<unknown, T> | undefined) ?? null;
}

export function clearHandoff(roomId: string): void {
    cache.delete(roomId);
}
