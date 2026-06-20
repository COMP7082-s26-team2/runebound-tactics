"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { GameRoomProvider } from "@/context/colyseus";
import { MultiplayerGame } from "@/components/game/MultiplayerGame";
import { useRoomConnect } from "@/lib/multiplayer/reconnect";
import { getDisplayName } from "@/lib/multiplayer/identity";
import { ClientOnly } from "@/components/util/ClientOnly";

export default function GamePage({ params }: { params: Promise<{ gameRoomId: string }> }) {
    const { gameRoomId } = use(params);
    const router = useRouter();
    const { joinOrReconnectGame, clearGameToken } = useRoomConnect();

    return (
        <ClientOnly fallback={<p className="text-white p-4">Connecting…</p>}>
            <GameRoomProvider
                connect={() =>
                    joinOrReconnectGame(gameRoomId, getDisplayName()).catch(err => {
                        console.error("[GamePage] join failed:", err);
                        clearGameToken();
                        router.replace("/lobbies?reason=reconnect_failed");
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
