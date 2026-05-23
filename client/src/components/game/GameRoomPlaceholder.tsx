"use client";

import { useRouter } from "next/navigation";
import { useGameRoom, useGameRoomState } from "@/context/colyseus";
import { Button } from "@/components/ui/Button";
import { clearGameToken } from "@/lib/multiplayer/reconnect";

export function GameRoomPlaceholder() {
    const { room } = useGameRoom();
    const state = useGameRoomState();
    const router = useRouter();

    if (!room || !state) return <p className="text-white p-4">Connecting…</p>;

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
