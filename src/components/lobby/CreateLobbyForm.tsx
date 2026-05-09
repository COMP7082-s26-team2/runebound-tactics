"use client";

import { useState } from "react";

interface Props {
    onSubmit: (displayName: string, lobbyName: string, maxPlayers: 2 | 3 | 4) => void;
    isLoading: boolean;
}

export function CreateLobbyForm({ onSubmit, isLoading }: Props) {
    const [displayName, setDisplayName] = useState("");
    const [lobbyName, setLobbyName] = useState("");
    const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(2);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!displayName.trim() || !lobbyName.trim()) return;
        onSubmit(displayName.trim(), lobbyName.trim(), maxPlayers);
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
            <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-zinc-300">Display Name</span>
                <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={24}
                    placeholder="Enter your name"
                    disabled={isLoading}
                    className="bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
            </label>

            <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-zinc-300">Lobby Name</span>
                <input
                    type="text"
                    value={lobbyName}
                    onChange={(e) => setLobbyName(e.target.value)}
                    maxLength={32}
                    placeholder="Enter lobby name"
                    disabled={isLoading}
                    className="bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
            </label>

            <fieldset className="flex flex-col gap-1 text-sm">
                <legend className="font-semibold text-zinc-300 mb-1">Max Players</legend>
                <div className="flex gap-3">
                    {([2, 3, 4] as const).map((n) => (
                        <label key={n} className="flex items-center gap-1 cursor-pointer text-zinc-200">
                            <input
                                type="radio"
                                name="maxPlayers"
                                value={n}
                                checked={maxPlayers === n}
                                onChange={() => setMaxPlayers(n)}
                                disabled={isLoading}
                                className="accent-amber-500"
                            />
                            {n}
                        </label>
                    ))}
                </div>
            </fieldset>

            <button
                type="submit"
                disabled={isLoading || !displayName.trim() || !lobbyName.trim()}
                className="mt-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded transition-colors"
            >
                {isLoading ? "Creating..." : "Create Lobby"}
            </button>
        </form>
    );
}
