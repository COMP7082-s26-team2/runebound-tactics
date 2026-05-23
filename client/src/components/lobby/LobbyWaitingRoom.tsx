"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLobbyRoom, useLobbyRoomMessage, useLobbyRoomState } from "@/context/colyseus";
import { SlotList } from "./SlotList";
import { Button } from "@/components/ui/Button";
import { clearLobbyToken } from "@/lib/multiplayer/reconnect";

export function LobbyWaitingRoom() {
    const { room } = useLobbyRoom();
    const state = useLobbyRoomState();
    const router = useRouter();
    const [countdown, setCountdown] = useState<number | null>(null);

    useLobbyRoomMessage("countdown", (payload: { seconds: number }) => {
        setCountdown(payload.seconds);
    });
    useLobbyRoomMessage("countdown_cancelled", () => {
        setCountdown(null);
    });
    useLobbyRoomMessage("game_starting", (payload: { roomId: string }) => {
        clearLobbyToken();
        router.push(`/game/${payload.roomId}`);
    });

    const gameRoomId = state?.gameRoomId;
    useEffect(() => {
        if (gameRoomId) {
            clearLobbyToken();
            router.push(`/game/${gameRoomId}`);
        }
    }, [gameRoomId, router]);

    if (!room || !state) return <p className="text-white p-4">Connecting…</p>;

    const me = state.players[room.sessionId];
    const isReady = !!me?.isReady;
    const playerCount = Object.keys(state.players).length;

    function toggleReady() {
        room?.send("set_ready", { isReady: !isReady });
    }

    async function leave() {
        clearLobbyToken();
        try { await room?.leave(true); } catch { /* ignore */ }
        router.push("/multiplayer");
    }

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col gap-4 p-4">
            <h1 className="text-white text-2xl">
                {state.lobbyName} — {playerCount}/{state.maxPlayers}
            </h1>
            <SlotList
                players={state.players}
                maxPlayers={state.maxPlayers}
                mySessionId={room.sessionId}
            />
            <Button onClick={toggleReady}>{isReady ? "Cancel Ready" : "Ready"}</Button>
            {countdown !== null && countdown > 0 && (
                <p className="text-yellow-300">Starting in {countdown}…</p>
            )}
            <Button onClick={leave}>Leave</Button>
        </div>
    );
}
