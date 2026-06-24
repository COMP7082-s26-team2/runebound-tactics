"use client";

import { useRouter } from "next/navigation";
import type { LobbySummary } from "@runebound-tactics/shared";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Numeric } from "@/components/ui/Numeric";
import { Panel } from "@/components/ui/Panel";

// Mirrors the RoomAvailable shape from useLobbyList — LobbySummary is the metadata payload.
export interface LobbyRoomEntry {
    roomId: string;
    metadata?: LobbySummary;
}

interface LobbyBrowserProps {
    rooms: LobbyRoomEntry[] | null;
    error: Error | null;
    loading: boolean;
    onRefresh: () => void;
}

export function LobbyBrowser({ rooms, error, loading, onRefresh }: LobbyBrowserProps) {
    const router = useRouter();

    const joinable = (rooms ?? []).filter((r) => {
        const status = r.metadata?.status ?? "waiting";
        return status === "waiting";
    });

    return (
        <Panel skin="chamber" className="w-full max-w-2xl p-6 flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
                <Eyebrow className="text-[var(--brass-500)]">Open Lobbies</Eyebrow>
                <Button intent="secondary" size="sm" onClick={onRefresh}>
                    Refresh
                </Button>
            </div>

            {error && (
                <Hint tone="error">Couldn&apos;t load lobbies: {error.message}</Hint>
            )}

            {loading && rooms === null && <Hint>Loading lobbies…</Hint>}

            {rooms !== null && joinable.length === 0 && !error && (
                <Hint>No lobbies open — host one yourself.</Hint>
            )}

            {joinable.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {joinable.map((room) => {
                        const name = room.metadata?.lobbyName ?? "Lobby";
                        const playerCount = room.metadata?.playerCount ?? 0;
                        const maxPlayers = room.metadata?.maxPlayers ?? 0;
                        return (
                            <li key={room.roomId}>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/lobby/${room.roomId}`)}
                                    className="w-full text-left px-4 py-3 bg-[var(--ink-800)] [box-shadow:var(--bevel-chamber)] hover:bg-[var(--ink-700)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-300)] transition-colors flex items-center justify-between gap-4"
                                >
                                    <span className="font-bold text-[var(--vellum-050)] truncate">
                                        {name}
                                    </span>
                                    <span className="flex items-baseline gap-1 shrink-0">
                                        <Numeric size="sm" tone="brass">{playerCount}</Numeric>
                                        <span className="text-[var(--ink-500)]">/</span>
                                        <Numeric size="sm" tone="faded">{maxPlayers}</Numeric>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}
