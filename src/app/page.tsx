"use client";

import { useState } from "react";

// 1. Update the import to grab GridMovementCanvas from your scenes folder
import GridMovementCanvas from "@/components/scenes/GridMovementCanvas"; 

import MainMenu from "@/components/MainMenu";
import GameModeScreen from "@/components/GameModeScreen";
import MultiplayerScreen from "@/components/MultiplayerScreen";
import LobbyScreen from "@/components/LobbyScreen"; 

type ScreenState = "menu" | "mode" | "multiplayer" | "lobbies" | "game";

export default function Page() {
    const [currentScreen, setCurrentScreen] = useState<ScreenState>("menu");

    return (
        <main className="flex flex-col flex-1 bg-white font-sans min-h-screen">
            
            {currentScreen === "menu" && (
                <MainMenu 
                    onStart={() => setCurrentScreen("mode")} 
                />
            )}

            {currentScreen === "mode" && (
                <GameModeScreen 
                    onMultiplayer={() => setCurrentScreen("multiplayer")} 
                    onBack={() => setCurrentScreen("menu")} 
                />
            )}

            {currentScreen === "multiplayer" && (
                <MultiplayerScreen 
                    onFindLobby={() => setCurrentScreen("lobbies")} 
                    onBack={() => setCurrentScreen("mode")} 
                />
            )}

            {currentScreen === "lobbies" && (
                <LobbyScreen 
                    onStartGame={() => setCurrentScreen("game")} 
                    onBackClick={() => setCurrentScreen("multiplayer")} 
                />
            )}

            {/* 2. Render the GridMovementCanvas when the game starts */}
            {currentScreen === "game" && (
                <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
                    <GridMovementCanvas debug={true} />
                </div>
            )}

        </main>
    );
}