"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_LOBBY } from "@runebound-tactics/shared";
import type { LobbySummary } from "@runebound-tactics/shared";
import { useLobbyList } from "@/lib/multiplayer/useLobbyList";
import { ClientOnly } from "@/components/util/ClientOnly";
import { Button } from "@/components/ui/Button";
import { CreateLobbyModal } from "@/components/lobby/CreateLobbyModal";
import { LobbyBrowser } from "@/components/lobby/LobbyBrowser";

function LobbiesPageInner() {
    const router = useRouter();
    const { rooms, error, loading, refresh } = useLobbyList<LobbySummary>(ROOM_LOBBY);
    const [createOpen, setCreateOpen] = useState(false);

    return (
        <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex flex-col items-center justify-center p-6 gap-6">
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
                <Button intent="secondary" size="md" onClick={() => router.back()}>
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
