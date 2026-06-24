"use client";

import { useState } from "react";

interface MainMenuProps {
    onStart: () => void;
}

export default function MainMenu({ onStart }: MainMenuProps) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 flex flex-col items-center justify-center font-sans text-slate-200 relative overflow-hidden">
            
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center">
                <h1 className="text-6xl md:text-7xl font-black mb-16 text-transparent bg-clip-text bg-gradient-to-b from-slate-100 to-slate-500 drop-shadow-2xl tracking-tighter uppercase">
                    Runebound Tactics
                </h1>

                <div className="flex flex-col gap-4 w-64">
                    <button 
                        onClick={onStart}
                        className="bg-slate-800 hover:bg-indigo-600 text-slate-100 transition-all duration-300 py-4 px-6 rounded border border-slate-700 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] font-bold tracking-widest uppercase"
                    >
                        Start Game
                    </button>
                    <button 
                        onClick={() => setIsLoginOpen(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all duration-300 py-3 px-6 rounded border border-slate-700 hover:border-slate-500 font-medium tracking-wide"
                    >
                        Log In
                    </button>
                    <button 
                        className="bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-rose-200 transition-all duration-300 py-3 px-6 rounded border border-slate-700 hover:border-rose-500 font-medium tracking-wide"
                    >
                        Quit
                    </button>
                </div>
            </div>

            {/* LOG IN MODAL */}
            {isLoginOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-indigo-500/50 p-8 rounded-lg shadow-[0_0_40px_rgba(79,70,229,0.2)] w-full max-w-sm relative">
                        <button 
                            onClick={() => setIsLoginOpen(false)} 
                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xl"
                        >
                            ✕
                        </button>
                        
                        <h2 className="text-2xl font-bold text-slate-100 mb-6 uppercase tracking-widest border-b border-slate-700 pb-2">
                            Tactician Login
                        </h2>
                        
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-mono text-slate-400 mb-1">Email / Username</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all" 
                                    placeholder="commander@runebound.com" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-mono text-slate-400 mb-1">Password</label>
                                <input 
                                    type="password" 
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all" 
                                    placeholder="••••••••" 
                                />
                            </div>
                            <button 
                                onClick={() => setIsLoginOpen(false)}
                                className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                            >
                                Authenticate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}