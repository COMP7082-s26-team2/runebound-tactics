"use client";

import { useState } from "react";

interface Props {
    onSubmit: (code: string, displayName: string) => void;
    isLoading: boolean;
    error?: string;
    prefillCode?: string;
}

const VALID_CHARS = /[^A-Z0-9]/g;

export function JoinLobbyForm({ onSubmit, isLoading, error, prefillCode }: Props) {
    const [displayName, setDisplayName] = useState("");
    const [code, setCode] = useState(prefillCode ?? "");

    function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
        const formatted = e.target.value
            .toUpperCase()
            .replace(VALID_CHARS, "")
            .slice(0, 6);
        setCode(formatted);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!displayName.trim() || code.length !== 6) return;
        onSubmit(code, displayName.trim());
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
                <span className="font-semibold text-zinc-300">Room Code</span>
                <input
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="e.g. X7K2PQ"
                    disabled={isLoading}
                    className="bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-500 font-mono tracking-widest focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
            </label>

            {error && (
                <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
                type="submit"
                disabled={isLoading || !displayName.trim() || code.length !== 6}
                className="mt-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded transition-colors"
            >
                {isLoading ? "Joining..." : "Join Lobby"}
            </button>
        </form>
    );
}
