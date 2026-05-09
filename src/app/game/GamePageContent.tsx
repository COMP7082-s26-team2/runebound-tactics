"use client";

import { useSearchParams } from "next/navigation";

export function GamePageContent() {
    const searchParams = useSearchParams();
    const roomId = searchParams.get("roomId");

    return (
        <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-bold text-amber-500">Match Starting</h1>
            {roomId ? (
                <p className="text-zinc-400 text-sm">
                    Room:{" "}
                    <span className="font-mono text-amber-400 tracking-widest">
                        {roomId}
                    </span>
                </p>
            ) : (
                <p className="text-zinc-500 text-sm">No room ID provided.</p>
            )}
            <p className="text-zinc-600 text-xs">Game canvas coming soon.</p>
        </main>
    );
}
