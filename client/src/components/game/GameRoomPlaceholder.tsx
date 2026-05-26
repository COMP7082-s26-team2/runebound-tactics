"use client";

import { useRouter } from "next/navigation";
import { useGameRoom, useGameRoomState } from "@/context/colyseus";
import { Button } from "@/components/ui/Button";
import { clearGameToken } from "@/lib/multiplayer/reconnect";
import { MultiplayerGameCanvas } from "@/components/game/MultiplayerGameCanvas";

export function GameRoomPlaceholder({ expectedRoomId }: { expectedRoomId: string }) {
    const { room, error } = useGameRoom();
    const state = useGameRoomState();
    const router = useRouter();

    const roomMatches = room?.roomId === expectedRoomId;

    if (error && (!room || roomMatches)) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col gap-3 p-4">
                <p className="text-red-400">Couldn&apos;t join game: {error.message}</p>
                <Button onClick={() => { clearGameToken(); router.push("/multiplayer"); }}>
                    ◀ Back to Multiplayer
                </Button>
            </div>
        );
    }

    if (!room || !state || !state.players || !roomMatches) return <p className="text-white p-4">Connecting…</p>;

    if (state.phase === "active") {
        return <MultiplayerGameCanvas />;
    }

    const me = state.players[room.sessionId];
    const players = Object.values(state.players);

    async function leave() {
        clearGameToken();
        try { await room?.leave(true); } catch { /* ignore */ }
        router.push("/multiplayer");
    }

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col gap-3 p-4">
            <Button onClick={leave}>◀ Leave</Button>
            <h1 className="text-white text-2xl">Game Room: {room.roomId}</h1>
            <p className="text-gray-300">Phase: {state.phase}</p>
            <p className="text-white">You are: {me?.displayName ?? "(joining…)"}</p>
            <p className="text-white">Connected players ({players.length}):</p>
            <ul className="flex flex-col gap-1">
                {players.map(p => (
                    <li key={p.sessionId} className="text-white">
                        • {p.displayName} ({p.faction || "—"})
                        {p.sessionId === room.sessionId && " (you)"}
                    </li>
                ))}
            </ul>
            <p className="text-gray-500 mt-4">[Game UI coming soon]</p>
        </div>
    );
}
