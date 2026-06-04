"use client";

import { useState } from "react";
import MainMenu from "@/components/MainMenu";
import GameModeScreen from "@/components/GameModeScreen";
import MultiplayerScreen from "@/components/lobby/MultiplayerScreen"; 
import GridMovementCanvas from "@/components/scenes/GridMovementCanvas"; 
import { ShowcaseHUD } from "@/components/game/ShowcaseHUD";

type AppState = 'main' | 'gamemode' | 'singleplayer' | 'multiplayer' | 'game';

export default function Home() {
    const [currentScreen, setCurrentScreen] = useState<AppState>('main');

    // Rendering logic based on state
    switch (currentScreen) {
        case 'main':
            return (
                <MainMenu 
                    onStart={() => setCurrentScreen('gamemode')} 
                />
            );
            
        case 'gamemode':
            return (
                <GameModeScreen 
                    onSingleplayer={() => setCurrentScreen('singleplayer')}
                    onMultiplayer={() => setCurrentScreen('multiplayer')}
                    onBack={() => setCurrentScreen('main')}
                />
            );

        case 'singleplayer':
            return (
                <div className="relative w-full h-screen bg-black overflow-hidden">
                    {/* Your UI Showcase Overlay */}
                    <ShowcaseHUD />
                    
                    {/* The Game Engine Canvas */}
                    <GridMovementCanvas />

                    {/* Exit Demo Button */}
                    <button 
                        onClick={() => setCurrentScreen('gamemode')}
                        className="absolute bottom-4 right-4 text-slate-500 hover:text-slate-300 transition-colors py-2 px-4 font-medium uppercase tracking-widest text-sm z-50"
                    >
                        Exit Demo
                    </button>
                </div>
            );

        case 'multiplayer':
            return (
                <MultiplayerScreen 
                    onBack={() => setCurrentScreen('gamemode')}
                />
            );

        case 'game':
            return (
                <div className="relative w-full h-screen bg-black overflow-hidden">
                    <button 
                        onClick={() => setCurrentScreen('main')} 
                        className="absolute top-4 left-4 z-50 bg-slate-800 border border-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded shadow-lg hover:bg-rose-900 hover:border-rose-500 transition-all font-mono text-xs uppercase tracking-widest"
                    >
                        ← Abort Game
                    </button>
                    
                    <GridMovementCanvas />
                </div>
            );

        default:
            return <MainMenu onStart={() => setCurrentScreen('gamemode')} />;
    }
}