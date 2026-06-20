"use client";

import type { Room } from "@colyseus/sdk";
import { LobbyState, GameState } from "@runebound-tactics/shared";
import { useCallback } from "react";
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

interface GameReconnectCallbacks {
    onReconnect?: () => void;
    onFailure?: (message: string) => void;
}

/**
 * Provides the existing room join helpers through one React hook and manages
 * the live game connection lifecycle after a room has been joined.
 */
export function useRoomConnect() {
    const joinOrReconnectLobby = useCallback(
        (roomId: string, displayName: string) =>
            joinOrReconnect<LobbyState>(
                LOBBY_TOKEN,
                roomId,
                { displayName },
                LobbyState,
            ),
        [],
    );

    const joinOrReconnectGame = useCallback(
        (roomId: string, displayName: string) =>
            joinOrReconnect<GameState>(
                GAME_TOKEN,
                roomId,
                { displayName },
                GameState,
            ),
        [],
    );

    const clearLobbyToken = useCallback(() => {
        if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(LOBBY_TOKEN);
        }
    }, []);

    const clearGameToken = useCallback(() => {
        if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(GAME_TOKEN);
        }
    }, []);

    const watchGameConnection = useCallback(
        (
            room: Room<unknown, GameState>,
            callbacks: GameReconnectCallbacks = {},
        ) => {
            let reconnecting = false;

            const handleDrop = () => {
                reconnecting = true;

                // The installed Colyseus SDK automatically attempts to reclaim
                // this room using its current reconnection token.
                window.sessionStorage.setItem(
                    GAME_TOKEN,
                    room.reconnectionToken,
                );
            };

            const handleReconnect = () => {
                reconnecting = false;

                // The old token was consumed. Store the replacement issued by
                // Colyseus so another later disconnect can also recover.
                queueMicrotask(() => {
                    window.sessionStorage.setItem(
                        GAME_TOKEN,
                        room.reconnectionToken,
                    );
                });
                callbacks.onReconnect?.();
            };

            const handleLeave = (_code: number, reason?: string) => {
                // Normal intentional leaves are handled by their own buttons.
                // A leave after onDrop means automatic reconnect retries ended.
                if (!reconnecting) return;

                reconnecting = false;
                clearGameToken();
                callbacks.onFailure?.(
                    reason?.trim() ||
                        "The game connection could not be restored.",
                );
            };

            room.onDrop(handleDrop);
            room.onReconnect(handleReconnect);
            room.onLeave(handleLeave);

            return () => {
                room.onDrop.remove(handleDrop);
                room.onReconnect.remove(handleReconnect);
                room.onLeave.remove(handleLeave);
            };
        },
        [clearGameToken],
    );

    return {
        joinOrReconnectLobby,
        joinOrReconnectGame,
        clearLobbyToken,
        clearGameToken,
        watchGameConnection,
    };
}
