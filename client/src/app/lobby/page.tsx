"use client";

import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { useState } from "react";

function LobbyPage() {
    const router = useRouter();
    const [createState, setCreateState] = useState(false);

    const handleCreate = () => {
        console.log(`Create Lobby Modal Show`);
        setCreateState(!createState);
    };

    const handleJoin = () => {
        console.log(`Join Lobby Modal Show`);
    };
    
    return (
        <>
            <div className="min-h-screen bg-gray-900 flex justify-center flex-col gap-4 p-4">
                <Button onClick={handleCreate}>Create Lobby</Button>
                <Button onClick={handleJoin}>Join Lobby</Button>
                <BackButton router={router}>Back</BackButton>
            </div>
        </>
    );
}

export default LobbyPage;
