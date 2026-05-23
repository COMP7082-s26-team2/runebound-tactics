"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { CreateLobbyModal } from "@/components/lobby/CreateLobbyModal";
import { getDisplayName, setDisplayName } from "@/lib/multiplayer/identity";

function MultiplayerPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        setName(getDisplayName());
    }, []);

    function handleNameChange(v: string) {
        setName(v);
        setDisplayName(v);
    }

    return (
        <>
            <div className="min-h-screen bg-gray-900 flex flex-col gap-4 p-4">
                <h1 className="text-white text-2xl">Multiplayer</h1>
                <label className="flex flex-col text-white">
                    Display Name
                    <input
                        type="text"
                        value={name}
                        onChange={e => handleNameChange(e.target.value)}
                        maxLength={32}
                        className="mt-1 px-2 py-1 bg-gray-800 text-white border border-gray-700 rounded"
                    />
                </label>
                <Button onClick={() => setCreateOpen(true)}>Create Lobby</Button>
                <Button onClick={() => router.push("/lobbies")}>Browse Lobbies</Button>
                <BackButton router={router}>Back</BackButton>
            </div>
            <CreateLobbyModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
        </>
    );
}

export default MultiplayerPage;
