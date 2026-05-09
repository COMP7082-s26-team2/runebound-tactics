"use client";

import { LobbySummary } from "@/lib/multiplayer";

interface Props {
    lobbies: LobbySummary[];
    onJoin: (roomId: string) => void;
    isLoading: boolean;
}

export function LobbyList({ lobbies, onJoin, isLoading }: Props) {
    if (lobbies.length === 0) {
        return (
            <p className="text-zinc-400 text-sm text-center py-6">
                No open lobbies. Create one!
            </p>
        );
    }

    return (
        <table className="w-full text-sm text-left">
            <thead>
                <tr className="text-zinc-400 border-b border-zinc-700">
                    <th className="pb-2 font-semibold">Lobby</th>
                    <th className="pb-2 font-semibold text-center">Players</th>
                    <th className="pb-2 font-semibold text-center">Code</th>
                    <th className="pb-2" />
                </tr>
            </thead>
            <tbody>
                {lobbies.map((lobby) => (
                    <tr key={lobby.roomId} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                        <td className="py-2 pr-4 text-white">{lobby.lobbyName}</td>
                        <td className="py-2 text-center text-zinc-300">
                            {lobby.playerCount} / {lobby.maxPlayers}
                        </td>
                        <td className="py-2 text-center font-mono text-amber-400 tracking-widest">
                            {lobby.roomId}
                        </td>
                        <td className="py-2 text-right">
                            <button
                                onClick={() => onJoin(lobby.roomId)}
                                disabled={isLoading || lobby.playerCount >= lobby.maxPlayers}
                                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1 rounded transition-colors"
                            >
                                {lobby.playerCount >= lobby.maxPlayers ? "Full" : "Join"}
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
