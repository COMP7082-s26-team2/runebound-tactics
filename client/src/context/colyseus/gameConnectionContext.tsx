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
    useGameRoomState,
    type GameRoomSnapshot,
} from "@/context/colyseus/gameRoomContext";
import { useRoomConnect } from "@/lib/multiplayer/reconnect";

export type GameReconnectStatus = "idle" | "reconnecting" | "failed";

interface ActiveGameTarget {
    roomId: string;
    displayName: string;
}

interface GameConnectionContextValue {
    activeGameRoomId: string | null;
    reconnectStatus: GameReconnectStatus;
    reconnectError: string | null;
    connectGame: (roomId: string, displayName: string) => void;
    leaveGame: (room: Room<unknown, GameState>) => Promise<void>;
    clearReconnectError: () => void;
}

interface GameStateSyncProps {
    activeGameRoomId: string | null;
    reconnectStatus: GameReconnectStatus;
    completeReconnect: () => void;
}

const GameConnectionContext =
    createContext<GameConnectionContextValue | null>(null);

/**
 * Waits for the reconnected room's full state before returning the player to
 * the game route and dismissing reconnecting state.
 */
function GameStateSync({
    activeGameRoomId,
    reconnectStatus,
    completeReconnect,
}: GameStateSyncProps) {
    const state = useGameRoomState();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (
            reconnectStatus !== "reconnecting" ||
            !activeGameRoomId ||
            !state
        ) {
            return;
        }

        const gamePath = `/game/${activeGameRoomId}`;
        completeReconnect();

        if (pathname !== gamePath) {
            router.replace(gamePath);
        }
    }, [
        activeGameRoomId,
        completeReconnect,
        pathname,
        reconnectStatus,
        router,
        state,
    ]);

    return null;
}

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
    const [target, setTarget] = useState<ActiveGameTarget | null>(null);
    const [roomSnapshot, setRoomSnapshot] = useState<GameRoomSnapshot>({
        room: undefined,
        error: undefined,
        isConnecting: false,
    });
    const [reconnectStatus, setReconnectStatus] =
        useState<GameReconnectStatus>("idle");
    const [reconnectError, setReconnectError] = useState<string | null>(null);
    const targetRef = useRef<ActiveGameTarget | null>(null);
    const connectionGenerationRef = useRef(0);
    const router = useRouter();
    const {
        joinOrReconnectGame,
        clearGameToken,
        watchGameConnection,
    } = useRoomConnect();

    const failConnection = useCallback(
        (error: unknown) => {
            const message =
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "The game connection could not be restored.";

            connectionGenerationRef.current += 1;
            targetRef.current = null;
            clearGameToken();
            setTarget(null);
            setRoomSnapshot({
                room: undefined,
                error:
                    error instanceof Error
                        ? error
                        : new Error(message),
                isConnecting: false,
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
                isConnecting: true,
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

                setRoomSnapshot({
                    room: nextRoom,
                    error: undefined,
                    isConnecting: false,
                });
            } catch (error) {
                if (connectionGenerationRef.current === generation) {
                    failConnection(error);
                }
            }
        },
        [failConnection, joinOrReconnectGame],
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
            setTarget(nextTarget);
            setReconnectStatus("idle");
            setReconnectError(null);
            void startConnection(nextTarget, false);
        },
        [roomSnapshot.room, startConnection],
    );

    const completeReconnect = useCallback(() => {
        setReconnectStatus("idle");
        setReconnectError(null);
    }, []);

    const leaveGame = useCallback(
        async (activeRoom: Room<unknown, GameState>) => {
            // Invalidate pending connection work before sending the consented
            // leave so its close event cannot start another reconnect.
            connectionGenerationRef.current += 1;
            targetRef.current = null;
            clearGameToken();
            setTarget(null);
            setRoomSnapshot({
                room: undefined,
                error: undefined,
                isConnecting: false,
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

    return (
        <GameConnectionContext.Provider value={contextValue}>
            <GameRoomStoreProvider value={roomSnapshot}>
                <GameStateSync
                    activeGameRoomId={target?.roomId ?? null}
                    reconnectStatus={reconnectStatus}
                    completeReconnect={completeReconnect}
                />
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
