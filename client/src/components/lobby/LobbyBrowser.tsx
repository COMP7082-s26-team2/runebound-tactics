"use client";

import { useEffect, useState } from "react";
import { client } from "@/lib/multiplayer/client";
import { ROOM_LOBBY } from "@runebound-tactics/shared";

interface Props {
    onJoin: (roomId: string) => void;
    onBack: () => void;
}

export function LobbyBrowser({ onJoin, onBack }: Props) {
    // These hooks are now correctly inside the function
    const [rooms, setRooms] = useState<any[]>([])
    
useEffect(() => {
    // Attempt to join the lobby room defined by ROOM_LOBBY
    client.joinOrCreate(ROOM_LOBBY)
        .then((lobbyRoom) => {
            // Once joined, listen to the state for the list of rooms
            lobbyRoom.onStateChange((state: any) => {
                // IMPORTANT: 'state.rooms' might be named 'availableRooms', 
                // 'gameRooms', or something else depending on your team's LobbyState
                if (state.rooms) {
                    setRooms(Array.from(state.rooms.values()));
                } else {
                    console.log("State received, but no 'rooms' property found:", state);
                }
            });
        })
        .catch((err) => {
            console.error("Failed to join lobby room:", err);
        });
}, []);
    
    // Everything is now properly wrapped in the return statement
    return (
        <div className="flex flex-col gap-4 w-full max-w-md p-6 bg-slate-900 border border-slate-700 rounded-lg">
            <h2 className="text-xl font-bold text-slate-100 uppercase tracking-widest border-b border-slate-700 pb-2">
                Active Lobbies
            </h2>
            
            {rooms.length === 0 ? (
                <p className="text-slate-500 italic text-sm font-mono">No active lobbies found.</p>
            ) : (
                rooms.map((room) => (
                    <button 
                        key={room.roomId}
                        onClick={() => onJoin(room.roomId)}
                        className="bg-slate-800 p-4 rounded border border-slate-700 hover:border-indigo-500 flex justify-between items-center group transition-all"
                    >
                        <span className="font-bold text-slate-200">
                            {room.metadata?.lobbyName || "Untitled Lobby"}
                        </span>
                        <span className="text-xs bg-slate-950 px-2 py-1 rounded text-slate-400 group-hover:text-indigo-400">
                            Join →
                        </span>
                    </button>
                ))
            )}
            
            <button 
                onClick={onBack} 
                className="text-slate-500 mt-4 underline text-sm hover:text-slate-300"
            >
                Cancel
            </button>
        </div>
    );
}