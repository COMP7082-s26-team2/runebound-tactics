"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field } from "@/components/ui/Field";
import { Hint } from "@/components/ui/Hint";
import { Panel } from "@/components/ui/Panel";
import { CreateLobbyModal } from "@/components/lobby/CreateLobbyModal";
import { getDisplayName, setDisplayName } from "@/lib/multiplayer/identity";

function MultiplayerPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setName(getDisplayName());
        setHydrated(true);
    }, []);

    function handleNameChange(v: string) {
        setName(v);
        setDisplayName(v);
    }

    if (!hydrated) {
        return (
            <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-500)] flex items-center justify-center p-6">
                Loading…
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex items-center justify-center p-6">
            <Panel skin="chamber" className="w-full max-w-md p-8 flex flex-col gap-6">
                <div className="text-center flex flex-col gap-2">
                    <Eyebrow className="text-[var(--brass-500)]">Live Match</Eyebrow>
                    <h1 className="text-[var(--text-2xl)] font-bold text-[var(--vellum-050)] leading-tight">
                        Take the field.
                    </h1>
                    <Hint>Set your name, then host or join.</Hint>
                </div>

                <Field
                    label="Display name"
                    value={name}
                    onChange={handleNameChange}
                    type="text"
                    placeholder="Tactician"
                    maxLength={32}
                    skin="chamber"
                />

                <div className="flex flex-col gap-2">
                    <Button intent="primary" size="lg" onClick={() => setCreateOpen(true)}>
                        Host a Lobby
                    </Button>
                    <Button intent="secondary" size="md" onClick={() => router.push("/lobbies")}>
                        Browse Lobbies
                    </Button>
                    <Button intent="secondary" size="md" onClick={() => router.back()}>
                        Back
                    </Button>
                </div>
            </Panel>

            <CreateLobbyModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
            />
        </main>
    );
}

export default MultiplayerPage;
