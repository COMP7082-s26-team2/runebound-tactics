"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Hint } from "@/components/ui/Hint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { client } from "@/lib/multiplayer/client";
import { ROOM_LOBBY, LobbyState } from "@runebound-tactics/shared";
import { getDisplayName } from "@/lib/multiplayer/identity";
import { stashHandoff } from "@/lib/multiplayer/roomHandoff";
import type { Room } from "@colyseus/sdk";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const MAX_PLAYER_OPTIONS = [2, 3, 4] as const;

export function CreateLobbyModal({ isOpen, onClose }: Props) {
    const router = useRouter();
    const [lobbyName, setLobbyName] = useState("My Lobby");
    const [maxPlayers, setMaxPlayers] = useState<number>(2);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function handleCreate() {
        setBusy(true);
        setErr(null);
        try {
            const displayName = getDisplayName();
            const room = await client.create<LobbyState>(
                ROOM_LOBBY,
                {
                    lobbyName: lobbyName.trim() || "My Lobby",
                    maxPlayers,
                    displayName,
                },
                LobbyState,
            );
            window.sessionStorage.setItem("lobby_token", room.reconnectionToken);
            stashHandoff(room as Room<unknown, unknown>);
            router.push(`/lobby/${room.roomId}`);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed to create lobby");
            setBusy(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Host a Lobby">
            <div className="flex flex-col gap-4">
                <Field
                    label="Lobby name"
                    value={lobbyName}
                    onChange={setLobbyName}
                    maxLength={32}
                    placeholder="My Lobby"
                    skin="chamber"
                />

                <div className="flex flex-col gap-1">
                    <Eyebrow className="text-[var(--ink-500)]">Max Players</Eyebrow>
                    <div className="flex gap-2">
                        {MAX_PLAYER_OPTIONS.map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setMaxPlayers(n)}
                                aria-pressed={maxPlayers === n}
                                className={`flex-1 px-4 py-2 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-300)] ${
                                    maxPlayers === n
                                        ? "bg-[var(--brass-500)] text-[var(--ink-900)] [box-shadow:var(--bevel-vellum)]"
                                        : "bg-transparent text-[var(--brass-300)] border-2 border-[var(--brass-500)] hover:bg-[var(--brass-500)] hover:text-[var(--ink-900)]"
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {err && <Hint tone="error">{err}</Hint>}

                <div className="flex gap-2">
                    <Button intent="primary" size="md" onClick={handleCreate} disabled={busy} className="flex-1">
                        {busy ? "Hosting…" : "Open Lobby"}
                    </Button>
                    <Button intent="secondary" size="md" onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
