"use client";

import { createRoomContext } from "@colyseus/react";
import type { LobbyState } from "@runebound-tactics/shared";

export const {
    RoomProvider:   LobbyRoomProvider,
    useRoom:        useLobbyRoom,
    useRoomState:   useLobbyRoomState,
    useRoomMessage: useLobbyRoomMessage,
} = createRoomContext<LobbyState>();
