"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import type { Room } from "@colyseus/sdk";
import type { GameState } from "@runebound-tactics/shared";
import { usePathname, useRouter } from "next/navigation";
import {
    GameRoomStoreProvider,
    type GameRoomSnapshot,
} from "@/context/colyseus/gameRoomContext";
import { useRoomConnect } from "@/lib/multiplayer/reconnect";

export type GameReconnectStatus = "idle" | "reconnecting" | "failed";

interface ActiveGameTarget {
    roomId: string;
    displayName: string;
}

interface GameConnectionContextValue {
    reconnectStatus: GameReconnectStatus;
    isReconnecting: boolean;
    stateSyncVersion: number;
    reconnectError: string | null;
    connectGame: (roomId: string, displayName: string) => void;
    leaveGame: (room: Room<unknown, GameState>) => Promise<void>;
    clearReconnectError: () => void;
}

const GameConnectionContext =
    createContext<GameConnectionContextValue | null>(null);

/**
 * Owns one active game room across route navigation and explicitly replaces a
 * dropped room only after its reconnect promise succeeds.
 *
 * Authentication, display-name behavior, and reconnect-token storage remain
 * in their existing multiplayer modules.
 */
export function GameConnectionProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [roomSnapshot, setRoomSnapshot] = useState<GameRoomSnapshot>({
        room: undefined,
        error: undefined,
    });
    const [reconnectStatus, setReconnectStatus] =
        useState<GameReconnectStatus>("idle");
    const [reconnectError, setReconnectError] = useState<string | null>(null);
    const [stateSyncVersion, setStateSyncVersion] = useState(0);
    const targetRef = useRef<ActiveGameTarget | null>(null);
    const connectionGenerationRef = useRef(0);
    const pathname = usePathname();
    const pathnameRef = useRef(pathname);
    const router = useRouter();
    const {
        joinOrReconnectGame,
        clearGameToken,
        watchGameConnection,
    } = useRoomConnect();

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    const failConnection = useCallback(
        (error: unknown) => {
            const message =
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "The game connection could not be restored.";

            connectionGenerationRef.current += 1;
            targetRef.current = null;
            clearGameToken();
            setRoomSnapshot({
                room: undefined,
                error:
                    error instanceof Error
                        ? error
                        : new Error(message),
            });
            setReconnectStatus("failed");
            setReconnectError(message);
            router.replace("/lobbies?reason=reconnect_failed");
        },
        [clearGameToken, router],
    );

    const startConnection = useCallback(
        async (
            gameTarget: ActiveGameTarget,
            reconnectOnly: boolean,
        ) => {
            const generation = connectionGenerationRef.current + 1;
            connectionGenerationRef.current = generation;
            setRoomSnapshot((current) => ({
                room: reconnectOnly ? current.room : undefined,
                error: undefined,
            }));

            try {
                const nextRoom = await joinOrReconnectGame(
                    gameTarget.roomId,
                    gameTarget.displayName,
                    { reconnectOnly },
                );

                if (connectionGenerationRef.current !== generation) {
                    await nextRoom.leave(true);
                    return;
                }

                // A joined room exists before its authoritative ROOM_STATE
                // message arrives. Waiting for the first state change prevents
                // the UI from treating an empty/default schema as restored.
                nextRoom.onStateChange.once(() => {
                    if (connectionGenerationRef.current !== generation) {
                        return;
                    }

                    setStateSyncVersion((version) => version + 1);

                    if (!reconnectOnly) {
                        return;
                    }

                    setReconnectStatus("idle");
                    setReconnectError(null);

                    const gamePath = `/game/${gameTarget.roomId}`;
                    if (pathnameRef.current !== gamePath) {
                        router.replace(gamePath);
                    }
                });

                setRoomSnapshot({
                    room: nextRoom,
                    error: undefined,
                });
            } catch (error) {
                if (connectionGenerationRef.current === generation) {
                    failConnection(error);
                }
            }
        },
        [failConnection, joinOrReconnectGame, router],
    );

    const requestReconnect = useCallback(() => {
        const activeTarget = targetRef.current;
        if (!activeTarget || reconnectStatus === "reconnecting") {
            return;
        }

        setReconnectStatus("reconnecting");
        setReconnectError(null);
        void startConnection(activeTarget, true);
    }, [reconnectStatus, startConnection]);

    useEffect(() => {
        const room = roomSnapshot.room;
        if (!room) return;

        return watchGameConnection(room, {
            onDrop: requestReconnect,
        });
    }, [requestReconnect, roomSnapshot.room, watchGameConnection]);

    const connectGame = useCallback(
        (roomId: string, displayName: string) => {
            if (targetRef.current?.roomId === roomId) {
                return;
            }

            const previousRoom = roomSnapshot.room;
            if (previousRoom) {
                void previousRoom.leave(true);
            }

            const nextTarget = { roomId, displayName };
            targetRef.current = nextTarget;
            setReconnectStatus("idle");
            setReconnectError(null);
            void startConnection(nextTarget, false);
        },
        [roomSnapshot.room, startConnection],
    );

    const leaveGame = useCallback(
        async (activeRoom: Room<unknown, GameState>) => {
            // Invalidate pending connection work before sending the consented
            // leave so its close event cannot start another reconnect.
            connectionGenerationRef.current += 1;
            targetRef.current = null;
            clearGameToken();
            setRoomSnapshot({
                room: undefined,
                error: undefined,
            });
            setReconnectStatus("idle");
            setReconnectError(null);
            await activeRoom.leave(true);
        },
        [clearGameToken],
    );

    const clearReconnectError = useCallback(() => {
        setReconnectError(null);
    }, []);

    const contextValue = useMemo<GameConnectionContextValue>(
        () => ({
            reconnectStatus,
            isReconnecting: reconnectStatus === "reconnecting",
            stateSyncVersion,
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
            stateSyncVersion,
        ],
    );

    return (
        <GameConnectionContext.Provider value={contextValue}>
            <GameRoomStoreProvider value={roomSnapshot}>
                {children}
            </GameRoomStoreProvider>
        </GameConnectionContext.Provider>
    );
}

export function useGameConnection(): GameConnectionContextValue {
    const context = useContext(GameConnectionContext);

    if (!context) {
        throw new Error(
            "useGameConnection must be used within GameConnectionProvider.",
        );
    }

    return context;
}
