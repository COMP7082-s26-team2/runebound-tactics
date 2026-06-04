"use client";

import { PlayerCard } from "../lobby/PlayerCard";

export function ShowcaseHUD() {
    const mockUnits = [
        { name: "Warrior", hp: 100, ad: 10, def: 5 },
        { name: "Archer", hp: 80, ad: 15, def: 2 }
    ];

    return (
        <>
            {/* Player Card centered vertically on the y-axis */}
            <div className="absolute top-1/2 left-4 -translate-y-1/2 z-50">
                <PlayerCard 
                    name="Tactician Jas" 
                    rank="Diamond I" 
                    units={mockUnits} 
                    isMe={true} 
                    isReady={true} 
                />
            </div>
            
            {/* SYSTEM log remains in the bottom-right corner */}
            <div className="absolute bottom-4 right-4 z-50 bg-slate-900/80 p-4 rounded border border-slate-700 text-white font-mono text-sm">
                SYSTEM: Tactical Overlay Active.
            </div>
        </>
    );
}