"use client";

import { useState } from "react";

interface LobbyScreenProps {
    onStartGame: () => void;
    onBackClick: () => void;
}

// 1. Defining our Database Types for the future
type Unit = { name: string; hp: number; ad: number; def: number; mov: number; range: number };
type Player = { id: string; name: string; rank: string; units: Unit[] };
type Lobby = { id: number; name: string; max: number; players: Player[] };

export default function LobbyScreen({ onStartGame, onBackClick }: LobbyScreenProps) {
    
    // 2. Hardcoded Player Data (Simulating Supabase Fetch)
    const myProfile: Player = {
        id: "p_local_user",
        name: "Tactician Jas",
        rank: "Diamond I",
        units: [
            { name: "Warrior", hp: 100, ad: 10, def: 5, mov: 3, range: 1 },
            { name: "Archer", hp: 100, ad: 10, def: 5, mov: 3, range: 1 }
        ]
    };

    const dummyPlayer: Player = {
        id: "p_dummy_1",
        name: "GarenMain99",
        rank: "Platinum III",
        units: [
            { name: "Swordsman", hp: 120, ad: 8, def: 8, mov: 2, range: 1 },
            { name: "Cleric", hp: 80, ad: 5, def: 4, mov: 3, range: 2 }
        ]
    };

    // 3. Lobby State with populated arrays instead of just numbers
    const [lobbies, setLobbies] = useState<Lobby[]>([
        { id: 1, name: "Lobby Alpha", max: 2, players: [] }, // 0/2
        { id: 2, name: "Lobby Bravo", max: 2, players: [dummyPlayer] }, // 1/2 (Ready for you to join and start!)
        { id: 3, name: "Lobby Charlie", max: 2, players: [dummyPlayer, { ...dummyPlayer, id: "p_dummy_2", name: "xX_Slayer_Xx" }] }, // 2/2
        { id: 4, name: "Lobby Delta", max: 4, players: [] }, // 0/4
        { id: 5, name: "Lobby Echo", max: 4, players: [dummyPlayer] }, // 1/4
        { id: 6, name: "Lobby Foxtrot", max: 4, players: [dummyPlayer, dummyPlayer, dummyPlayer] }, // 3/4
    ]);

    const [selectedLobbyId, setSelectedLobbyId] = useState<number | null>(null);

    // Join logic
    const handleJoinLobby = (lobbyId: number) => {
        const targetLobby = lobbies.find(l => l.id === lobbyId);
        if (!targetLobby || targetLobby.players.length >= targetLobby.max) return;

        // Add 'myProfile' to the lobby's player array
        setLobbies(prev => prev.map(lobby => 
            lobby.id === lobbyId ? { ...lobby, players: [...lobby.players, myProfile] } : lobby
        ));
        setSelectedLobbyId(lobbyId);
    };

    // Leave logic
    const handleLeaveLobby = () => {
        setLobbies(prev => prev.map(lobby => 
            lobby.id === selectedLobbyId 
                ? { ...lobby, players: lobby.players.filter(p => p.id !== myProfile.id) } 
                : lobby
        ));
        setSelectedLobbyId(null);
    };

    const activeLobby = lobbies.find(l => l.id === selectedLobbyId);
    const isLobbyFull = activeLobby ? activeLobby.players.length === activeLobby.max : false;

    // --- VIEW 1: INSIDE THE LOBBY ROOM ---
    if (activeLobby) {
        return (
            <div className="min-h-screen bg-white flex flex-col font-sans text-black relative pt-12 px-8 max-w-5xl mx-auto w-full">
                
                {/* Room Header */}
                <div className="flex justify-between items-end border-b-2 border-gray-200 pb-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-normal">{activeLobby.name}</h1>
                        <p className="text-gray-500 mt-2">Waiting for players... ({activeLobby.players.length}/{activeLobby.max})</p>
                    </div>
                </div>

                {/* Dynamic Player Slots Grid */}
                <div className={`grid gap-6 w-full ${activeLobby.max > 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {/* We create an array of exactly the lobby's max size to render empty/full slots */}
                    {Array.from({ length: activeLobby.max }).map((_, index) => {
                        const player = activeLobby.players[index];

                        if (player) {
                            // FILLED SLOT
                            const isMe = player.id === myProfile.id;
                            return (
                                <div key={index} className={`border-2 ${isMe ? 'border-blue-400 bg-blue-50/30' : 'border-gray-300 bg-white'} rounded-xl p-6 shadow-sm flex flex-col`}>
                                    {/* Player Profile Header */}
                                    <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
                                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">👤</div>
                                        <div>
                                            <h3 className="text-xl font-bold">{player.name} {isMe && "(You)"}</h3>
                                            <span className="text-sm text-gray-500">{player.rank}</span>
                                        </div>
                                    </div>

                                    {/* Units & Stats Display */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Warband Configuration</h4>
                                        <div className="flex flex-col gap-3">
                                            {player.units.map((unit, uIdx) => (
                                                <div key={uIdx} className="bg-gray-50 border border-gray-200 p-3 rounded-md flex justify-between items-center">
                                                    <span className="font-bold">{unit.name}</span>
                                                    <div className="flex gap-4 text-sm text-gray-600">
                                                        <span><strong className="text-black">{unit.hp}</strong> HP</span>
                                                        <span><strong className="text-black">{unit.ad}</strong> AD</span>
                                                        <span><strong className="text-black">{unit.def}</strong> DEF</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        } else {
                            // EMPTY SLOT
                            return (
                                <div key={index} className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] text-gray-400">
                                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl mb-4 opacity-50">⏳</div>
                                    <span className="text-lg">Waiting for tactician...</span>
                                </div>
                            );
                        }
                    })}
                </div>

                {/* Bottom Actions */}
                <div className="mt-auto py-12 flex justify-between items-center">
                    <button 
                        onClick={handleLeaveLobby}
                        className="bg-[#dcdcdc] hover:bg-[#cecece] transition-colors rounded-md px-12 py-3 text-black text-lg shadow-sm"
                    >
                        Leave Lobby
                    </button>

                    {isLobbyFull && (
                        <button 
                            onClick={onStartGame}
                            className="bg-green-600 hover:bg-green-500 text-white transition-all rounded-md px-12 py-3 text-lg font-bold shadow-lg animate-pulse"
                        >
                            Start Game
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // --- VIEW 2: THE LOBBY SELECTION GRID ---
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-black relative">
            <div className="flex-1 flex flex-col items-center pt-24 px-8 max-w-5xl mx-auto w-full">
                <h1 className="text-5xl font-normal mb-16">Lobbies</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 w-full">
                    {lobbies.map((lobby) => {
                        const isFull = lobby.players.length === lobby.max;
                        return (
                            <button 
                                key={lobby.id}
                                onClick={() => handleJoinLobby(lobby.id)}
                                disabled={isFull}
                                className={`${isFull ? "bg-[#f0f0f0] opacity-50 cursor-not-allowed" : "bg-[#dcdcdc] hover:bg-[#cecece]"} transition-all rounded-xl p-3 flex items-center justify-between w-full shadow-sm`}
                            >
                                <div className="w-16 h-16 border border-gray-500 bg-white relative overflow-hidden flex-shrink-0">
                                    <svg className="absolute inset-0 w-full h-full text-gray-500" preserveAspectRatio="none" viewBox="0 0 100 100">
                                        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1.5" />
                                        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1.5" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-center px-4">
                                    <span className="text-xl font-normal">{lobby.name}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center gap-1 w-12">
                                    <div className="w-8 h-8 rounded-full border border-gray-500 bg-transparent"></div>
                                    <span className="text-sm font-bold">{lobby.players.length}/{lobby.max}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="absolute bottom-12 left-12">
                <button 
                    onClick={onBackClick}
                    className="bg-[#dcdcdc] hover:bg-[#cecece] transition-colors rounded-md px-12 py-3 text-black text-lg shadow-sm"
                >
                    Back
                </button>
            </div>
        </div>
    );
}