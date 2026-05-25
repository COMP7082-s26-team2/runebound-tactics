"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { client } from "@/lib/multiplayer/client";
import { ROOM_LOBBY, LobbyState } from "@runebound-tactics/shared";
import { getDisplayName } from "@/lib/multiplayer/identity";
import { stashHandoff } from "@/lib/multiplayer/roomHandoff";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import type { Room } from "@colyseus/sdk";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateLobbyModal({ isOpen, onClose }: Props) {
    const router = useRouter();
    const [lobbyName, setLobbyName] = useState("My Lobby");
    const [maxPlayers, setMaxPlayers] = useState(2);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function handleCreate() {
        setBusy(true);
        setErr(null);
        try {
            const displayName = getDisplayName();
            const supabase = createBrowserSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token ?? "";
            const room = await client.create<LobbyState>(ROOM_LOBBY, {
                lobbyName: lobbyName.trim() || "My Lobby",
                maxPlayers,
                displayName,
                token,
            }, LobbyState);
            window.sessionStorage.setItem("lobby_token", room.reconnectionToken);
            stashHandoff(room as Room<unknown, unknown>);
            router.push(`/lobby/${room.roomId}`);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed to create lobby");
            setBusy(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Lobby">
            <div className="flex flex-col gap-3">
                <label className="flex flex-col text-gray-800">
                    Lobby Name
                    <input
                        type="text"
                        value={lobbyName}
                        onChange={e => setLobbyName(e.target.value)}
                        maxLength={32}
                        className="mt-1 px-2 py-1 border rounded"
                    />
                </label>
                <label className="flex flex-col text-gray-800">
                    Max Players
                    <select
                        value={maxPlayers}
                        onChange={e => setMaxPlayers(Number(e.target.value))}
                        className="mt-1 px-2 py-1 border rounded"
                    >
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                    </select>
                </label>
                {err && <p className="text-red-600">{err}</p>}
                <Button onClick={handleCreate} disabled={busy}>
                    {busy ? "Creating…" : "Create"}
                </Button>
            </div>
        </Modal>
    );
}
