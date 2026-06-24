"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLobbyRoom, useLobbyRoomMessage, useLobbyRoomState } from "@/context/colyseus";
import { SlotList } from "./SlotList";
import { Button } from "@/components/ui/Button";
import { useRoomConnect } from "@/lib/multiplayer/reconnect";

export function LobbyWaitingRoom({ expectedRoomId }: { expectedRoomId: string }) {
    const { room, error } = useLobbyRoom();
    const state = useLobbyRoomState();
    const router = useRouter();
    const { clearLobbyToken } = useRoomConnect();
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
    }, [clearLobbyToken, gameRoomId, router]);

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col gap-3 p-4">
                <p className="text-red-400">Couldn&apos;t join lobby: {error.message}</p>
                <Button onClick={() => { clearLobbyToken(); router.push("/multiplayer"); }}>
                    ◀ Back to Multiplayer
                </Button>
            </div>
        );
    }

    if (!room || !state || !state.players || !roomMatches) return <p className="text-white p-4">Connecting…</p>;

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
