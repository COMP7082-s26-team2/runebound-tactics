"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    useLobbyRoom,
    useLobbyRoomMessage,
    useLobbyRoomState,
} from "@/context/colyseus";
import { SlotList } from "./SlotList";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Numeric } from "@/components/ui/Numeric";
import { Panel } from "@/components/ui/Panel";
import { clearLobbyToken } from "@/lib/multiplayer/reconnect";

export function LobbyWaitingRoom({
    expectedRoomId,
}: {
    expectedRoomId: string;
}) {
    const { room, error } = useLobbyRoom();
    const state = useLobbyRoomState();
    const router = useRouter();
    const [countdown, setCountdown] = useState<number | null>(null);

    const roomMatches = room?.roomId === expectedRoomId;

    useLobbyRoomMessage("countdown", (payload: { seconds: number }) => {
        if (!roomMatches) return;
        setCountdown(payload.seconds);
    });
    useLobbyRoomMessage("countdown_cancelled", () => {
        if (!roomMatches) return;
        setCountdown(null);
    });
    useLobbyRoomMessage("game_starting", (payload: { roomId: string }) => {
        if (!roomMatches) return;
        clearLobbyToken();
        router.push(`/game/${payload.roomId}`);
    });

    const gameRoomId = roomMatches ? state?.gameRoomId : undefined;
    useEffect(() => {
        if (gameRoomId) {
            clearLobbyToken();
            router.push(`/game/${gameRoomId}`);
        }
    }, [gameRoomId, router]);

    if (error) {
        return (
            <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex flex-col items-center justify-center p-6 gap-4">
                <Panel skin="chamber" className="max-w-md p-6 flex flex-col gap-4">
                    <Hint tone="error">Couldn&apos;t join lobby: {error.message}</Hint>
                    <Button
                        intent="primary"
                        onClick={() => {
                            clearLobbyToken();
                            router.push("/multiplayer");
                        }}
                    >
                        Back to Multiplayer
                    </Button>
                </Panel>
            </main>
        );
    }

    if (!room || !state || !state.players || !roomMatches) {
        return (
            <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-500)] flex items-center justify-center p-6">
                Connecting…
            </main>
        );
    }

    const me = state.players[room.sessionId];
    const isReady = !!me?.isReady;
    const playerCount = Object.keys(state.players).length;

    function toggleReady() {
        room?.send("set_ready", { isReady: !isReady });
    }

    async function leave() {
        clearLobbyToken();
        try {
            await room?.leave(true);
        } catch {
            /* ignore */
        }
        router.push("/multiplayer");
    }

    return (
        <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex flex-col items-center p-6 gap-6">
            <div className="w-full max-w-4xl flex flex-col gap-2 text-center">
                <Eyebrow className="text-[var(--brass-500)]">Lobby</Eyebrow>
                <h1 className="text-[var(--text-2xl)] font-bold text-[var(--vellum-050)] leading-tight">
                    {state.lobbyName}
                </h1>
                <div className="flex items-baseline justify-center gap-2">
                    <Eyebrow className="text-[var(--ink-500)]">Tacticians</Eyebrow>
                    <Numeric size="md" tone="brass">{playerCount}</Numeric>
                    <span className="text-[var(--ink-500)]">/</span>
                    <Numeric size="md" tone="faded">{state.maxPlayers}</Numeric>
                </div>
            </div>

            <div className="w-full max-w-4xl">
                <SlotList
                    players={state.players}
                    maxPlayers={state.maxPlayers}
                    mySessionId={room.sessionId}
                />
            </div>

            {countdown !== null && countdown > 0 && (
                <Panel skin="chamber" className="px-4 py-2 flex items-baseline gap-2">
                    <Eyebrow className="text-[var(--brass-500)]">Starting in</Eyebrow>
                    <Numeric size="lg" tone="brass">{countdown}</Numeric>
                </Panel>
            )}

            <div className="flex gap-3 mt-2">
                <Button intent="primary" size="lg" onClick={toggleReady}>
                    {isReady ? "Cancel Ready" : "Ready"}
                </Button>
                <Button intent="secondary" size="md" onClick={leave}>
                    Leave Lobby
                </Button>
            </div>
        </main>
    );
}
