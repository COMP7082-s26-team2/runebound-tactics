"use client";

import { useCallback, useEffect, useState } from "react";

interface RoomAvailable<Metadata = unknown> {
    roomId: string;
    name: string;
    clients: number;
    maxClients: number;
    metadata?: Metadata;
}

function httpBase(): string {
    const ws = process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";
    return ws.replace(/^ws/, "http");
}

export function useLobbyList<Metadata = unknown>(roomName: string, intervalMs = 3000) {
    const [rooms, setRooms] = useState<RoomAvailable<Metadata>[] | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${httpBase()}/rooms/${roomName}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as RoomAvailable<Metadata>[];
            setRooms(data);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e : new Error(String(e)));
        } finally {
            setLoading(false);
        }
    }, [roomName]);

    useEffect(() => {
        let alive = true;
        // Initial load: defer to a microtask so setLoading(true) inside refresh()
        // fires from a callback rather than synchronously in the effect body
        // (avoids react-hooks/set-state-in-effect while preserving polling behavior).
        const initial = setTimeout(() => { if (alive) refresh(); }, 0);
        const id = setInterval(() => { if (alive) refresh(); }, intervalMs);
        const onFocus = () => { if (alive) refresh(); };
        window.addEventListener("focus", onFocus);
        return () => {
            alive = false;
            clearTimeout(initial);
            clearInterval(id);
            window.removeEventListener("focus", onFocus);
        };
    }, [refresh, intervalMs]);

    return { rooms, error, loading, refresh };
}
