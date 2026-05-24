"use client";

import { useState } from "react";
import MainMenu from "../components/MainMenu";
import LoadingScreen from "../components/LoadingScreen";
import Leaderboard from "../components/Leaderboard";
import MatchHistory from "../components/MatchHistory";
import RoyalDecrees from "../components/RoyalDecrees";
import LoginModal from "../components/LoginModal";
import TacticalArena from "../components/TacticalArena"; // <-- Import the new Arena

// Added "arena" to the possible states
type ScreenState = "menu" | "loading" | "leaderboard" | "history" | "decrees" | "arena";

export default function Home() {
    const [currentScreen, setCurrentScreen] = useState<ScreenState>("menu");
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    const renderScreen = () => {
        if (currentScreen === "loading") {
            return <LoadingScreen onComplete={() => setCurrentScreen("arena")} />;
        }
        if (currentScreen === "arena") {
            // Tell the arena that "Exiting" means going back to the menu
            return <TacticalArena onExitGame={() => setCurrentScreen("menu")} />; 
        }
        if (currentScreen === "leaderboard") {
            return <Leaderboard onBackClick={() => setCurrentScreen("menu")} />;
        }
        if (currentScreen === "history") {
            return <MatchHistory onBackClick={() => setCurrentScreen("menu")} />;
        }
        if (currentScreen === "decrees") {
            return <RoyalDecrees onBackClick={() => setCurrentScreen("menu")} />;
        }

        // Default to Main Menu
        return (
            <MainMenu 
                onPlayClick={() => setCurrentScreen("loading")}
                onLeaderboardClick={() => setCurrentScreen("leaderboard")}
                onHistoryClick={() => setCurrentScreen("history")}
                onDecreesClick={() => setCurrentScreen("decrees")}
                onLoginClick={() => setIsLoginOpen(true)}
            />
        );
    };

    return (
        <>
            {renderScreen()}

            {isLoginOpen && (
                <LoginModal onClose={() => setIsLoginOpen(false)} />
            )}
        </>
    );
}