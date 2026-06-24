"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLobbyReconnectTarget } from "@/lib/lobby/actions";

export function LobbyReconnectGate() {
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;

        async function checkLobbyReconnect(): Promise<void> {
            // Ask the server to read the authenticated user's persisted lobby
            // presence. Keeping this on the server avoids trusting client-side
            // storage for the reconnect target.
            const result = await getLobbyReconnectTarget();

            // The user may navigate away before the server action resolves; in
            // that case, do not trigger a stale redirect.
            if (cancelled) return;

            // This gate is mounted only on /lobbies. Redirecting from the
            // lobby-room page itself would create a loop and is outside the
            if (result.target === "lobby") {
                router.replace(`/lobby/${result.lobbyRoomId}`);
            }
        }

        checkLobbyReconnect().catch(error => {
            console.error("[LobbyReconnectGate] Failed to check lobby reconnect:", error);
        });

        return () => {
            // Mark the async check as stale when this component unmounts.
            cancelled = true;
        };
    }, [router]);

    return null;
}
