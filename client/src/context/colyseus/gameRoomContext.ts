"use client";

import { createRoomContext } from "@colyseus/react";

export const {
    RoomProvider: GameRoomProvider,
    useRoom: useGameRoom,
    useRoomState: useGameRoomState,
} = createRoomContext();
