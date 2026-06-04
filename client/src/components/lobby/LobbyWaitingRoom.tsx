"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLobbyRoom, useLobbyRoomMessage, useLobbyRoomState } from "@/context/colyseus";
import { clearLobbyToken } from "@/lib/multiplayer/reconnect";

export function LobbyWaitingRoom({ expectedRoomId }: { expectedRoomId: string }) {
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
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-4 text-slate-200 font-sans">
                <p className="text-rose-400 font-mono">Connection Error: {error.message}</p>
                <button 
                    onClick={() => { clearLobbyToken(); router.push("/multiplayer"); }}
                    className="bg-slate-800 hover:bg-slate-700 py-2 px-6 rounded tracking-widest uppercase text-sm border border-slate-700"
                >
                    ← Back to Multiplayer
                </button>
            </div>
        );
    }

    if (!room || !state || !state.players || !roomMatches) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 font-mono tracking-widest uppercase animate-pulse">
                Establishing Server Connection...
            </div>
        );
    }

    const me = state.players[room.sessionId];
    const isReady = !!me?.isReady;
    const playerCount = Object.keys(state.players).length;

    // Helper map to quickly find players by their assigned slot
    const playersBySlot = new Map();
    Object.values(state.players).forEach(p => playersBySlot.set(p.slot, p));

    function toggleReady() {
        room?.send("set_ready", { isReady: !isReady });
    }

    async function leave() {
        clearLobbyToken();
        try { await room?.leave(true); } catch { /* ignore */ }
        router.push("/multiplayer");
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200 relative pt-12 px-8 max-w-5xl mx-auto w-full">
            
            {/* Header Area */}
            <div className="flex justify-between items-end border-b-2 border-slate-800 pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-slate-100">{state.lobbyName}</h1>
                    <p className="text-slate-400 mt-2 font-mono text-sm">
                        {countdown !== null && countdown > 0 
                            ? <span className="text-amber-400 animate-pulse">Deploying in {countdown}...</span>
                            : `Awaiting tacticians... (${playerCount}/${state.maxPlayers})`
                        }
                    </p>
                </div>
            </div>

            {/* Dynamic Visual Slot Grid */}
            <div className={`grid gap-6 w-full ${state.maxPlayers > 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                {Array.from({ length: state.maxPlayers }).map((_, index) => {
                    const slotNumber = index + 1;
                    const occupant = playersBySlot.get(slotNumber);

                    if (occupant) {
                        const isMe = occupant.sessionId === room.sessionId;
                        return (
                            <div key={slotNumber} className={`border border-slate-700 bg-slate-900 rounded-xl p-6 shadow-xl flex flex-col relative overflow-hidden ${isMe ? 'ring-1 ring-indigo-500/50' : ''}`}>
                                {isMe && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase">Local Tactician</div>}
                                
                                <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4 mt-2">
                                    <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center text-xl border border-slate-700 shadow-inner">👤</div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-100">{occupant.displayName}</h3>
                                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${occupant.isReady ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                            {occupant.isReady ? "✓ READY" : "NOT READY"}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Faction Assigment</h4>
                                    <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded flex justify-between items-center">
                                        <span className="font-bold text-sm text-slate-300">{occupant.faction || "Awaiting Orders..."}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <div key={slotNumber} className="border border-dashed border-slate-800 bg-slate-900/50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] text-slate-600">
                                <div className="w-16 h-16 rounded bg-slate-800/50 flex items-center justify-center text-2xl mb-4 opacity-50 animate-pulse">⏳</div>
                                <span className="text-sm font-mono tracking-widest uppercase">Slot {slotNumber} Open</span>
                            </div>
                        );
                    }
                })}
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto py-12 flex justify-between items-center">
                <button 
                    onClick={leave}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded py-3 px-8 text-sm font-bold tracking-widest uppercase"
                >
                    Leave Lobby
                </button>

                <button 
                    onClick={toggleReady}
                    className={`transition-all rounded py-3 px-12 text-sm font-bold tracking-widest uppercase shadow-lg ${
                        isReady 
                        ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)]'
                    }`}
                >
                    {isReady ? "Cancel Ready" : "Toggle Ready"}
                </button>
            </div>
        </div>
    );
}