import type { Room } from "@colyseus/sdk";
import { LobbyState, GameState } from "@runebound-tactics/shared";
import { client } from "./client";
import { getAuthenticatedJoinOptions } from "./authJoinOptions";

const LOBBY_TOKEN = "lobby_token";
const GAME_TOKEN  = "game_token";

async function joinOrReconnect<S>(
    storageKey: string,
    roomId: string,
    options: { displayName: string },
    rootSchema: new () => S,
): Promise<Room<unknown, S>> {
    if (typeof window === "undefined") {
        throw new Error("Cannot join from server-side");
    }
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) {
        const [tokenRoomId] = stored.split(":");
        if (tokenRoomId === roomId) {
            try {
                const room = await client.reconnect<S>(stored, rootSchema);
                window.sessionStorage.setItem(storageKey, room.reconnectionToken);
                return room;
            } catch {
                window.sessionStorage.removeItem(storageKey);
            }
        } else {
            window.sessionStorage.removeItem(storageKey);
        }
    }
    // Attach Supabase auth to normal joins. Reconnect uses the stored Colyseus
    // reconnection token above, while fresh joins must prove the user identity.
    const authOptions = await getAuthenticatedJoinOptions();
    const room = await client.joinById<S>(
        roomId,
        {
            ...options,
            ...authOptions,
        },
        rootSchema,
    );
    window.sessionStorage.setItem(storageKey, room.reconnectionToken);
    return room;
}

export function joinOrReconnectLobby(roomId: string, displayName: string) {
    return joinOrReconnect<LobbyState>(LOBBY_TOKEN, roomId, { displayName }, LobbyState);
}

export function joinOrReconnectGame(roomId: string, displayName: string) {
    return joinOrReconnect<GameState>(GAME_TOKEN, roomId, { displayName }, GameState);
}

export function clearLobbyToken(): void {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(LOBBY_TOKEN);
}

export function clearGameToken(): void {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(GAME_TOKEN);
}
