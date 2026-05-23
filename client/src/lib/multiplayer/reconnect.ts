import type { Room } from "@colyseus/sdk";
import { client } from "./client";

const LOBBY_TOKEN = "lobby_token";
const GAME_TOKEN  = "game_token";

async function joinOrReconnect<T>(
    storageKey: string,
    roomId: string,
    options: { displayName: string },
): Promise<Room<unknown, T>> {
    if (typeof window === "undefined") {
        throw new Error("Cannot join from server-side");
    }
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) {
        try {
            const room = await client.reconnect<T>(stored);
            window.sessionStorage.setItem(storageKey, room.reconnectionToken);
            return room;
        } catch {
            window.sessionStorage.removeItem(storageKey);
        }
    }
    const room = await client.joinById<T>(roomId, options);
    window.sessionStorage.setItem(storageKey, room.reconnectionToken);
    return room;
}

export function joinOrReconnectLobby<T>(roomId: string, displayName: string) {
    return joinOrReconnect<T>(LOBBY_TOKEN, roomId, { displayName });
}

export function joinOrReconnectGame<T>(roomId: string, displayName: string) {
    return joinOrReconnect<T>(GAME_TOKEN, roomId, { displayName });
}

export function clearLobbyToken(): void {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(LOBBY_TOKEN);
}

export function clearGameToken(): void {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(GAME_TOKEN);
}
