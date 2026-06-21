"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type { Room } from "@colyseus/sdk";
import type { GameState } from "@runebound-tactics/shared";
import { usePathname, useRouter } from "next/navigation";
import {
    GameRoomProvider,
    useGameRoom,
    useGameRoomState,
} from "@/context/colyseus/gameRoomContext";
import { ClientOnly } from "@/components/util/ClientOnly";
import { useRoomConnect } from "@/lib/multiplayer/reconnect";

export type GameReconnectStatus = "idle" | "reconnecting" | "failed";

const INITIAL_CONNECTION_ATTEMPT = 0;

interface GameConnectionTarget {
    roomId: string;
    displayName: string;
    reconnectOnly: boolean;
    attempt: number;
}

interface GameConnectionContextValue {
    activeGameRoomId: string | null;
    reconnectStatus: GameReconnectStatus;
    reconnectError: string | null;
    connectGame: (roomId: string, displayName: string) => void;
    leaveGame: (room: Room<unknown, GameState>) => Promise<void>;
    clearReconnectError: () => void;
}

interface GameConnectionLifecycleProps {
    target: GameConnectionTarget | null;
    requestReconnect: () => void;
    completeConnection: () => void;
    failConnection: (error: unknown) => void;
}

const GameConnectionContext =
    createContext<GameConnectionContextValue | null>(null);

/**
 * Observes the room owned by the persistent provider and translates Colyseus
 * lifecycle events into one reconnect attempt at a time.
 */
function GameConnectionLifecycle({
    target,
    requestReconnect,
    completeConnection,
    failConnection,
}: GameConnectionLifecycleProps) {
    const { room, error } = useGameRoom();
    const state = useGameRoomState();
    const pathname = usePathname();
    const router = useRouter();
    const { watchGameConnection } = useRoomConnect();

    useEffect(() => {
        if (!room || !target || room.roomId !== target.roomId) return;

        return watchGameConnection(room, {
            onDrop: requestReconnect,
        });
    }, [requestReconnect, room, target, watchGameConnection]);

    useEffect(() => {
        if (!room || !state || !target || room.roomId !== target.roomId) {
            return;
        }

        const restoredGamePath = `/game/${target.roomId}`;
        const shouldRestoreRoute = target.reconnectOnly &&
            pathname !== restoredGamePath;

        completeConnection();

        if (shouldRestoreRoute) {
            router.replace(restoredGamePath);
        }
    }, [
        completeConnection,
        pathname,
        room,
        router,
        state,
        target,
    ]);

    useEffect(() => {
        if (error && target) {
            failConnection(error);
        }
    }, [error, failConnection, target]);

    return null;
}

/**
 * Keeps the active game room mounted while the user moves between app routes.
 *
 * This context owns connection status and room targeting only. Authentication,
 * display-name behavior, and token storage remain in their existing modules.
 */
export function GameConnectionProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [target, setTarget] = useState<GameConnectionTarget | null>(null);
    const [reconnectStatus, setReconnectStatus] =
        useState<GameReconnectStatus>("idle");
    const [reconnectError, setReconnectError] = useState<string | null>(null);
    const router = useRouter();
    const {
        joinOrReconnectGame,
        clearGameToken,
    } = useRoomConnect();

    const connectGame = useCallback(
        (roomId: string, displayName: string) => {
            setReconnectError(null);
            setReconnectStatus("idle");
            setTarget((current) => {
                if (current?.roomId === roomId) {
                    return current;
                }

                return {
                    roomId,
                    displayName,
                    reconnectOnly: false,
                    attempt: INITIAL_CONNECTION_ATTEMPT,
                };
            });
        },
        [],
    );

    const requestReconnect = useCallback(() => {
        setReconnectStatus("reconnecting");
        setTarget((current) => {
            if (!current || current.reconnectOnly) {
                return current;
            }

            return {
                ...current,
                reconnectOnly: true,
                attempt: current.attempt + 1,
            };
        });
    }, []);

    const completeConnection = useCallback(() => {
        setReconnectStatus("idle");
        setReconnectError(null);
        setTarget((current) => {
            if (!current?.reconnectOnly) {
                return current;
            }

            return {
                ...current,
                reconnectOnly: false,
            };
        });
    }, []);

    const failConnection = useCallback(
        (error: unknown) => {
            const message =
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "The game connection could not be restored.";

            clearGameToken();
            setTarget(null);
            setReconnectStatus("failed");
            setReconnectError(message);
            router.replace("/lobbies?reason=reconnect_failed");
        },
        [clearGameToken, router],
    );

    const leaveGame = useCallback(
        async (room: Room<unknown, GameState>) => {
            // Clear local reconnect ownership before the consented leave so its
            // close event cannot start an accidental reconnect attempt.
            clearGameToken();
            setTarget(null);
            setReconnectStatus("idle");
            setReconnectError(null);
            await room.leave(true);
        },
        [clearGameToken],
    );

    const clearReconnectError = useCallback(() => {
        setReconnectError(null);
    }, []);

    const value = useMemo<GameConnectionContextValue>(
        () => ({
            activeGameRoomId: target?.roomId ?? null,
            reconnectStatus,
            reconnectError,
            connectGame,
            leaveGame,
            clearReconnectError,
        }),
        [
            clearReconnectError,
            connectGame,
            leaveGame,
            reconnectError,
            reconnectStatus,
            target?.roomId,
        ],
    );

    const connect = target
        ? () =>
              joinOrReconnectGame(
                  target.roomId,
                  target.displayName,
                  { reconnectOnly: target.reconnectOnly },
              )
        : null;

    return (
        <GameConnectionContext.Provider value={value}>
            {/* The Colyseus room store is browser-only; render normal route
                content during SSR and mount the persistent room after hydration. */}
            <ClientOnly fallback={children}>
                <GameRoomProvider
                    connect={connect}
                    deps={[target?.roomId, target?.attempt]}
                >
                    <GameConnectionLifecycle
                        target={target}
                        requestReconnect={requestReconnect}
                        completeConnection={completeConnection}
                        failConnection={failConnection}
                    />
                    {children}
                </GameRoomProvider>
            </ClientOnly>
        </GameConnectionContext.Provider>
    );
}

/**
 * Accesses the persistent active-game connection coordinator.
 */
export function useGameConnection(): GameConnectionContextValue {
    const context = useContext(GameConnectionContext);

    if (!context) {
        throw new Error(
            "useGameConnection must be used within GameConnectionProvider.",
        );
    }

    return context;
}
