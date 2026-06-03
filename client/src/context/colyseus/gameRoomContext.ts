"use client";

import { createRoomContext } from "@colyseus/react";
import type { GameState } from "@runebound-tactics/shared";

export const {
    RoomProvider:   GameRoomProvider,
    useRoom:        useGameRoom,
    useRoomState:   useGameRoomState,
    useRoomMessage: useGameRoomMessage,
} = createRoomContext<GameState>();
