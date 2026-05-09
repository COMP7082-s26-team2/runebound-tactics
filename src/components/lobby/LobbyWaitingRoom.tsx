"use client";

import { PlayerSlot } from "@/lib/multiplayer";

interface Props {
    roomId: string;
    lobbyName: string;
    players: PlayerSlot[];
    maxPlayers: number;
    localSessionId: string;
    isReady: boolean;
    isStarting: boolean;
    onReady: () => void;
    onUnready: () => void;
    onLeave: () => void;
}

export function LobbyWaitingRoom({
    roomId,
    lobbyName,
    players,
    maxPlayers,
    localSessionId,
    isReady,
    isStarting,
    onReady,
    onUnready,
    onLeave,
}: Props) {
    const slots = Array.from({ length: maxPlayers }, (_, i) => {
        return players.find((p) => p.slot === i + 1) ?? null;
    });

    const canReady = players.length >= 2;

    function copyCode() {
        navigator.clipboard.writeText(roomId);
    }

    return (
        <div className="relative w-full max-w-md">
            {isStarting && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg z-10">
                    <p className="text-amber-400 font-bold text-lg animate-pulse">
                        Match starting...
                    </p>
                </div>
            )}

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-zinc-800 px-4 py-3 flex items-center justify-between">
                    <h2 className="text-white font-bold text-base truncate">{lobbyName}</h2>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <span className="font-mono text-amber-400 tracking-widest text-sm">{roomId}</span>
                        <button
                            onClick={copyCode}
                            title="Copy room code"
                            className="text-zinc-400 hover:text-white text-xs border border-zinc-600 rounded px-2 py-0.5 transition-colors"
                        >
                            Copy
                        </button>
                    </div>
                </div>

                {/* Player slots */}
                <div className="divide-y divide-zinc-800">
                    {slots.map((player, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between px-4 py-3"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-500 text-xs w-5">
                                    {i + 1}
                                </span>
                                {player ? (
                                    <span className="text-white text-sm">
                                        {player.displayName}
                                        {player.sessionId === localSessionId && (
                                            <span className="text-zinc-500 text-xs ml-1">(you)</span>
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-zinc-600 text-sm italic">
                                        — Waiting —
                                    </span>
                                )}
                            </div>

                            {player && (
                                <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                                        player.ready
                                            ? "bg-green-800 text-green-300"
                                            : "bg-zinc-700 text-zinc-400"
                                    }`}
                                >
                                    {player.ready ? "READY" : "WAITING"}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 bg-zinc-800 flex gap-2">
                    {!isReady ? (
                        <button
                            onClick={onReady}
                            disabled={!canReady || isStarting}
                            title={!canReady ? "Waiting for another player..." : undefined}
                            className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded transition-colors text-sm"
                        >
                            {!canReady ? "Waiting for players..." : "Ready"}
                        </button>
                    ) : (
                        <button
                            onClick={onUnready}
                            disabled={isStarting}
                            className="flex-1 bg-zinc-600 hover:bg-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded transition-colors text-sm"
                        >
                            Unready
                        </button>
                    )}

                    <button
                        onClick={onLeave}
                        disabled={isStarting}
                        className="bg-zinc-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 hover:text-white font-bold py-2 px-4 rounded transition-colors text-sm"
                    >
                        Leave
                    </button>
                </div>
            </div>
        </div>
    );
}
