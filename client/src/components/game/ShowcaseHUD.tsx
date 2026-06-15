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
    {/* Replace the dynamic classes with fixed positioning */}
        <div className="absolute top-20 left-4 z-50">
            <PlayerCard 
                name="Tactician Jas" 
                rank="Diamond I" 
                units={mockUnits} 
                isMe={true} 
                isReady={true} 
            />
</div>
        </>
    );
}