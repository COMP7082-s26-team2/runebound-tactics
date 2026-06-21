"use client";

import {
    createContext,
    useContext,
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
    isConnecting: boolean;
}

const EMPTY_GAME_ROOM_SNAPSHOT: GameRoomSnapshot = {
    room: undefined,
    error: undefined,
    isConnecting: false,
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
