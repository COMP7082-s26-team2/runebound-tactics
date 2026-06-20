"use client";

import { use, useEffect } from "react";
import { useGameConnection } from "@/context/colyseus";
import { MultiplayerGame } from "@/components/game/MultiplayerGame";
import { getDisplayName } from "@/lib/multiplayer/identity";
import { ClientOnly } from "@/components/util/ClientOnly";

export default function GamePage({ params }: { params: Promise<{ gameRoomId: string }> }) {
    const { gameRoomId } = use(params);
    const { connectGame } = useGameConnection();

    useEffect(() => {
        // Activating the target here lets the root-level coordinator keep the
        // room alive even if navigation temporarily leaves the game route.
        connectGame(gameRoomId, getDisplayName());
    }, [connectGame, gameRoomId]);

    return (
        <ClientOnly fallback={<p className="text-white p-4">Connecting…</p>}>
            <MultiplayerGame expectedRoomId={gameRoomId} />
        </ClientOnly>
    );
}
