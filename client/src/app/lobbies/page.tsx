"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROOM_LOBBY } from "@runebound-tactics/shared";
import type { LobbySummary } from "@runebound-tactics/shared";
import { useLobbyList } from "@/lib/multiplayer/useLobbyList";
import { ClientOnly } from "@/components/util/ClientOnly";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { CreateLobbyModal } from "@/components/lobby/CreateLobbyModal";
import { useGameConnection } from "@/context/colyseus";
import { LobbyReconnectGate } from "@/components/lobby/LobbyReconnectGate";

function LobbiesPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { reconnectError, clearReconnectError } = useGameConnection();
    const { rooms, error, loading, refresh } = useLobbyList<LobbySummary>(ROOM_LOBBY);
    const [createOpen, setCreateOpen] = useState(false);
    const [showReconnectError, setShowReconnectError] = useState(
        searchParams.get("reason") === "reconnect_failed",
    );

    const joinable = (rooms ?? []).filter(r => {
        const status = r.metadata?.status ?? "waiting";
        return status === "waiting";
    });

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col gap-4 p-4">
            <LobbyReconnectGate />
            <h1 className="text-white text-2xl">Lobbies</h1>
            {showReconnectError && (
                <div className="flex items-center gap-2 text-red-400">
                    <p>
                        {reconnectError ??
                            "The game connection could not be restored."}
                    </p>
                    <Button
                        onClick={() => {
                            setShowReconnectError(false);
                            clearReconnectError();
                        }}
                    >
                        Dismiss
                    </Button>
                </div>
            )}
            {error && <p className="text-red-400">Error: {error.message}</p>}
            {loading && rooms === null && <p className="text-white">Loading…</p>}
            {rooms !== null && joinable.length === 0 && (
                <p className="text-gray-400">No lobbies — host one!</p>
            )}
            {joinable.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {joinable.map(room => (
                        <li key={room.roomId}>
                            <Button onClick={() => router.push(`/lobby/${room.roomId}`)}>
                                {room.metadata?.lobbyName ?? "Lobby"} — {room.metadata?.playerCount ?? 0}/{room.metadata?.maxPlayers ?? 0}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex gap-2">
                <Button onClick={() => setCreateOpen(true)}>Create</Button>
                <Button onClick={refresh}>Refresh</Button>
            </div>
            <BackButton router={router}>Back</BackButton>
            <CreateLobbyModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
        </div>
    );
}

export default function LobbiesPage() {
    return (
        <ClientOnly fallback={<p className="text-white p-4">Loading…</p>}>
            <LobbiesPageInner />
        </ClientOnly>
    );
}
