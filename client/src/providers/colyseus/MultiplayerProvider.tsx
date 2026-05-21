"use client";

import { GameRoomProvider, LobbyListProvider } from "@/context/colyseus";
import { client } from "@/lib/multiplayer/client";

interface MultiplayerProviderProps {
    children?: React.ReactNode;
}

export function MultiplayerProvider({ children }: MultiplayerProviderProps) {
    return (
        <LobbyListProvider connect={() => client.joinOrCreate("lobby")}>
            <GameRoomProvider connect={() => client.joinOrCreate("game_room")}>
                {children}
            </GameRoomProvider>
        </LobbyListProvider>
    );
}
