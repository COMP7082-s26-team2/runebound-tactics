"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import type { LobbyState } from "@runebound-tactics/shared";
import { LobbyRoomProvider } from "@/context/colyseus";
import { LobbyWaitingRoom } from "@/components/lobby/LobbyWaitingRoom";
import { joinOrReconnectLobby, clearLobbyToken } from "@/lib/multiplayer/reconnect";
import { getDisplayName } from "@/lib/multiplayer/identity";
import { peekHandoff } from "@/lib/multiplayer/roomHandoff";
import { ClientOnly } from "@/components/util/ClientOnly";

export default function LobbyPage({ params }: { params: Promise<{ lobbyRoomId: string }> }) {
    const { lobbyRoomId } = use(params);
    const router = useRouter();

    return (
        <ClientOnly fallback={<p className="text-white p-4">Connecting…</p>}>
            <LobbyRoomProvider
                connect={() => {
                    const handed = peekHandoff<LobbyState>(lobbyRoomId);
                    if (handed) return Promise.resolve(handed);
                    return joinOrReconnectLobby<LobbyState>(lobbyRoomId, getDisplayName()).catch(err => {
                        console.error("[LobbyPage] join failed:", err);
                        clearLobbyToken();
                        router.replace("/multiplayer");
                        throw err;
                    });
                }}
                deps={[lobbyRoomId]}
            >
                <LobbyWaitingRoom />
            </LobbyRoomProvider>
        </ClientOnly>
    );
}
