"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateLobbyModal } from "@/components/lobby/CreateLobbyModal";
import { LobbyBrowser } from "@/components/lobby/LobbyBrowser";

interface MultiplayerScreenProps {
    onBack: () => void;
}

export default function MultiplayerScreen({ onBack }: MultiplayerScreenProps) {
    const router = useRouter();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isJoinIdOpen, setIsJoinIdOpen] = useState(false);
    const [showBrowser, setShowBrowser] = useState(false);

    // If the browser is open, show the list instead of the buttons
    if (showBrowser) {
        return (
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 flex flex-col items-center justify-center font-sans text-slate-200">
                <LobbyBrowser 
                    onJoin={(roomId) => router.push(`/lobby/${roomId}`)} 
                    onBack={() => setShowBrowser(false)} 
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 flex flex-col items-center justify-center font-sans text-slate-200">
            
            <h1 className="text-4xl font-bold mb-16 text-slate-100 uppercase tracking-widest border-b border-indigo-500/30 pb-4">
                Multiplayer
            </h1>

            <div className="flex flex-col gap-4 w-72">
                <button 
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all duration-300 py-3 px-6 rounded border border-slate-700 hover:border-slate-500 font-medium tracking-wide"
                >
                    Create a Lobby
                </button>
                <button 
                    onClick={() => setShowBrowser(true)}
                    className="bg-slate-800 hover:bg-indigo-600 text-slate-100 transition-all duration-300 py-4 px-6 rounded border border-slate-700 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] font-bold tracking-wider shadow-lg"
                >
                    Find a Lobby
                </button>
                <button 
                    onClick={() => setIsJoinIdOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all duration-300 py-3 px-6 rounded border border-slate-700 hover:border-slate-500 font-medium tracking-wide"
                >
                    Enter Lobby ID
                </button>
                <button 
                    onClick={onBack}
                    className="mt-8 text-slate-500 hover:text-slate-300 transition-colors py-2 px-4 font-medium uppercase tracking-widest text-sm"
                >
                    ← Back to Mode Select
                </button>
            </div>

            <CreateLobbyModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

            {isJoinIdOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-indigo-500/50 p-8 rounded-lg shadow-[0_0_40px_rgba(79,70,229,0.2)] w-full max-w-sm relative">
                        <button onClick={() => setIsJoinIdOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xl">✕</button>
                        
                        <h2 className="text-2xl font-bold text-slate-100 mb-6 uppercase tracking-widest border-b border-slate-700 pb-2">
                            Direct Connect
                        </h2>
                        
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-mono text-slate-400 mb-1">Lobby ID Code</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-center text-2xl tracking-widest text-slate-200 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:opacity-30" 
                                    placeholder="Lobby ID" 
                                    maxLength={9}
                                />
                            </div>
                            <button 
                                onClick={() => setIsJoinIdOpen(false)}
                                className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                            >
                                Join Battle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}