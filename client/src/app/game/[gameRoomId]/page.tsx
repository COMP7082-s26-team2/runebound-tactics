"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { GameRoomProvider } from "@/context/colyseus";
import { GameRoomPlaceholder } from "@/components/game/GameRoomPlaceholder";
import { joinOrReconnectGame, clearGameToken } from "@/lib/multiplayer/reconnect";
import { getDisplayName } from "@/lib/multiplayer/identity";
import { ClientOnly } from "@/components/util/ClientOnly";

export default function GamePage({ params }: { params: Promise<{ gameRoomId: string }> }) {
    const { gameRoomId } = use(params);
    const router = useRouter();

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
                <GameRoomPlaceholder expectedRoomId={gameRoomId} />
            </GameRoomProvider>
        </ClientOnly>
    );
}
