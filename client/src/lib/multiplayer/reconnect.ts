"use client";

import type { Room } from "@colyseus/sdk";
import { LobbyState, GameState } from "@runebound-tactics/shared";
import { useCallback } from "react";
import { client } from "./client";
import { getAuthenticatedJoinOptions } from "./authJoinOptions";

const LOBBY_TOKEN = "lobby_token";
const GAME_TOKEN  = "game_token";

interface GameConnectOptions {
    reconnectOnly?: boolean;
}

interface InFlightGameReconnect {
    roomId: string;
    promise: Promise<Room<unknown, GameState>>;
}

interface GameConnectionCallbacks {
    onDrop?: () => void;
    onReconnect?: () => void;
    onLeave?: (wasDropped: boolean, message: string | null) => void;
    onFailure?: (message: string) => void;
}

let inFlightGameReconnect: InFlightGameReconnect | null = null;

function getStoredRoomToken(storageKey: string, roomId: string): string | null {
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return null;

    const [tokenRoomId] = stored.split(":");
    if (tokenRoomId === roomId) {
        return stored;
    }

    window.sessionStorage.removeItem(storageKey);
    return null;
}

async function joinOrReconnect<S>(
    storageKey: string,
    roomId: string,
    options: { displayName: string },
    rootSchema: new () => S,
): Promise<Room<unknown, S>> {
    if (typeof window === "undefined") {
        throw new Error("Cannot join from server-side");
    }
    const stored = getStoredRoomToken(storageKey, roomId);
    if (stored) {
        try {
            const room = await client.reconnect<S>(stored, rootSchema);
            window.sessionStorage.setItem(storageKey, room.reconnectionToken);
            return room;
        } catch {
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

async function joinOrReconnectGameRoom(
    roomId: string,
    displayName: string,
    options: GameConnectOptions = {},
): Promise<Room<unknown, GameState>> {
    if (typeof window === "undefined") {
        throw new Error("Cannot join from server-side");
    }

    const storedToken = getStoredRoomToken(GAME_TOKEN, roomId);

    if (storedToken) {
        // A reconnection token is single-use. Remove it before the attempt so
        // another caller cannot consume the same token concurrently.
        window.sessionStorage.removeItem(GAME_TOKEN);

        if (!inFlightGameReconnect) {
            const promise = client.reconnect<GameState>(
                storedToken,
                GameState,
            );
            inFlightGameReconnect = { roomId, promise };
        } else if (inFlightGameReconnect.roomId !== roomId) {
            throw new Error("Another game reconnection is already in progress.");
        }

        try {
            const room = await inFlightGameReconnect.promise;

            // Explicit reconnects are coordinated by useRoomConnect, so disable
            // the SDK's independent retry loop before a future connection drop.
            room.reconnection.enabled = false;
            window.sessionStorage.setItem(
                GAME_TOKEN,
                room.reconnectionToken,
            );
            return room;
        } catch (error) {
            if (options.reconnectOnly) {
                throw error;
            }
        } finally {
            inFlightGameReconnect = null;
        }
    }

    if (options.reconnectOnly) {
        throw new Error("The game reconnection token is unavailable or expired.");
    }

    const authOptions = await getAuthenticatedJoinOptions();
    const room = await client.joinById<GameState>(
        roomId,
        {
            displayName,
            ...authOptions,
        },
        GameState,
    );

    room.reconnection.enabled = false;
    window.sessionStorage.setItem(GAME_TOKEN, room.reconnectionToken);
    return room;
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
        (
            roomId: string,
            displayName: string,
            options?: GameConnectOptions,
        ) => joinOrReconnectGameRoom(roomId, displayName, options),
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
            callbacks: GameConnectionCallbacks = {},
        ) => {
            let wasDropped = false;

            const handleDrop = () => {
                wasDropped = true;
                callbacks.onDrop?.();
            };

            const handleReconnect = () => {
                wasDropped = false;
                callbacks.onReconnect?.();
            };

            const handleLeave = (_code: number, reason?: string) => {
                const message = reason?.trim() || null;
                callbacks.onLeave?.(
                    wasDropped,
                    message,
                );

                // Existing consumers use this terminal callback until
                // connection ownership moves to the persistent coordinator.
                if (wasDropped && callbacks.onFailure) {
                    callbacks.onFailure(
                        message ||
                            "The game connection could not be restored.",
                    );
                }
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
        [],
    );

    return {
        joinOrReconnectLobby,
        joinOrReconnectGame,
        clearLobbyToken,
        clearGameToken,
        watchGameConnection,
    };
}
