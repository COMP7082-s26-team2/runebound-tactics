"use client";

import { useLobbyList } from "@/context/colyseus";

function LobbiesPage() {
    const { rooms, error, isConnecting } = useLobbyList();

    if (isConnecting) return <p>Connecting...</p>;
    if (error) return <p>Error: {error.message}</p>;

    return (
        <ul>
            {rooms?.map((room) => (
                <li key={room.roomId}>
                    {room.name} — {room.clients}/{room.maxClients} players
                </li>
            ))}
        </ul>
    );
}

export default LobbiesPage;
