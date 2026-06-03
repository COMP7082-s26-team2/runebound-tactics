"use client";

import { use } from "react";
import { GameRoomProvider } from "@/context/colyseus";
import { MultiplayerGame } from "@/components/game/MultiplayerGame";
import { joinOrReconnectGame, clearGameToken } from "@/lib/multiplayer/reconnect";
import { getDisplayName } from "@/lib/multiplayer/identity";
import { ClientOnly } from "@/components/util/ClientOnly";

export default function GamePage({ params }: { params: Promise<{ gameRoomId: string }> }) {
    const { gameRoomId } = use(params);

    return (
        <ClientOnly fallback={<p className="text-white p-4">Connecting…</p>}>
            <GameRoomProvider
                connect={() =>
                    joinOrReconnectGame(gameRoomId, getDisplayName()).catch(err => {
                        console.error("[GamePage] join failed:", err);
                        clearGameToken();
                        throw err;
                    })
                }
                deps={[gameRoomId]}
            >
                <MultiplayerGame expectedRoomId={gameRoomId} />
            </GameRoomProvider>
        </ClientOnly>
    );
}
