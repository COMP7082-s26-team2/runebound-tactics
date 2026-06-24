"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROOM_LOBBY } from "@runebound-tactics/shared";
import type { LobbySummary } from "@runebound-tactics/shared";
import { useLobbyList } from "@/lib/multiplayer/useLobbyList";
import { ClientOnly } from "@/components/util/ClientOnly";
import { Button } from "@/components/ui/Button";
import { CreateLobbyModal } from "@/components/lobby/CreateLobbyModal";
import { LobbyBrowser } from "@/components/lobby/LobbyBrowser";
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

    return (
        <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex flex-col items-center justify-center p-6 gap-6">
            <LobbyReconnectGate />

            {showReconnectError && (
                <div className="flex items-center gap-3 text-[var(--seal-red)] text-sm">
                    <p>
                        {reconnectError ?? "The game connection could not be restored."}
                    </p>
                    <Button
                        intent="secondary"
                        size="sm"
                        onClick={() => {
                            setShowReconnectError(false);
                            clearReconnectError();
                        }}
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            <LobbyBrowser
                rooms={rooms}
                error={error}
                loading={loading}
                onRefresh={refresh}
            />

            <div className="flex gap-3">
                <Button intent="primary" size="lg" onClick={() => setCreateOpen(true)}>
                    Host a Lobby
                </Button>
                <Button intent="secondary" size="md" onClick={() => router.push("/multiplayer")}>
                    Back
                </Button>
            </div>

            <CreateLobbyModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
            />
        </main>
    );
}

export default function LobbiesPage() {
    return (
        <ClientOnly
            fallback={
                <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-500)] flex items-center justify-center p-6">
                    Loading…
                </main>
            }
        >
            <LobbiesPageInner />
        </ClientOnly>
    );
}
