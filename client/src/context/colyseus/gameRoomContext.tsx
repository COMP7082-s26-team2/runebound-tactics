"use client";

import {
    createContext,
    useContext,
    useEffect,
    type ReactNode,
} from "react";
import {
    useRoomState as useColyseusRoomState,
} from "@colyseus/react";
import type { Room } from "@colyseus/sdk";
import type { GameState } from "@runebound-tactics/shared";

export interface GameRoomSnapshot {
    room: Room<unknown, GameState> | undefined;
    error: Error | undefined;
}

const EMPTY_GAME_ROOM_SNAPSHOT: GameRoomSnapshot = {
    room: undefined,
    error: undefined,
};

const GameRoomContext = createContext<GameRoomSnapshot>(
    EMPTY_GAME_ROOM_SNAPSHOT,
);

/**
 * Publishes the room owned by the game connection coordinator to game UI
 * consumers without delegating connection cleanup to another provider.
 */
export function GameRoomStoreProvider({
    value,
    children,
}: {
    value: GameRoomSnapshot;
    children: ReactNode;
}) {
    return (
        <GameRoomContext.Provider value={value}>
            {children}
        </GameRoomContext.Provider>
    );
}

export function useGameRoom(): GameRoomSnapshot {
    return useContext(GameRoomContext);
}

export function useGameRoomState() {
    const { room } = useGameRoom();
    return useColyseusRoomState(room);
}

export function useGameRoomMessage<T>(
    type: string,
    callback: (message: T) => void,
) {
    const { room } = useGameRoom();
    useEffect(() => {
        if (!room) return;
        room.onMessage(type, callback);
        return () => {
            room.onMessage(type, () => undefined);
        };
    }, [room, type, callback]);
}
