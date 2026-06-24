"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/multiplayer/client";
import { ROOM_LOBBY, LobbyState } from "@runebound-tactics/shared";
import { getDisplayName } from "@/lib/multiplayer/identity";
import { stashHandoff } from "@/lib/multiplayer/roomHandoff";
import type { Room } from "@colyseus/sdk";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateLobbyModal({ isOpen, onClose }: Props) {
    const router = useRouter();
    const [lobbyName, setLobbyName] = useState("");
    const [maxPlayers, setMaxPlayers] = useState(2);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function handleCreate() {
        setBusy(true);
        setErr(null);
        try {
            const displayName = getDisplayName();
            const room = await client.create<LobbyState>(ROOM_LOBBY, {
                lobbyName: lobbyName.trim() || `${displayName}'s War Room`,
                maxPlayers,
                displayName,
            }, LobbyState);
            window.sessionStorage.setItem("lobby_token", room.reconnectionToken);
            stashHandoff(room as Room<unknown, unknown>);
            router.push(`/lobby/${room.roomId}`);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed to create lobby");
            setBusy(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-emerald-500/50 p-8 rounded-lg shadow-[0_0_40px_rgba(16,185,129,0.15)] w-full max-w-sm relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xl">✕</button>
                
                <h2 className="text-2xl font-bold text-slate-100 mb-6 uppercase tracking-widest border-b border-slate-700 pb-2">
                    Deploy New Lobby
                </h2>
                
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Lobby Name</label>
                        <input 
                            type="text" 
                            value={lobbyName}
                            onChange={e => setLobbyName(e.target.value)}
                            maxLength={32}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all" 
                            placeholder="Lobby Name" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Max Players</label>
                        <select 
                            value={maxPlayers}
                            onChange={e => setMaxPlayers(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-200 focus:border-emerald-500 focus:outline-none appearance-none"
                        >
                            <option value={2}>2 Players (Duel)</option>
                            <option value={4}>4 Players (Skirmish)</option>
                        </select>
                    </div>

                    {err && <p className="text-rose-500 text-xs font-mono">{err}</p>}

                    <button 
                        onClick={handleCreate}
                        disabled={busy}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    >
                        {busy ? "Initializing..." : "Initialize Server"}
                    </button>
                </div>
            </div>
        </div>
    );
}