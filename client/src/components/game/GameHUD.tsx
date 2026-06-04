"use client";

import { Button } from "@/components/ui/Button";
import type { GameState } from "@runebound-tactics/shared";

interface UnitStats {
    name: string;
    health: number;
    attack: number;
    defense: number;
    movement: number;
    attackRange: number; 
}

interface GameHUDProps {
    state: GameState;
    sessionId: string;
    onLeave: () => void;
    onEndTurn: () => void;
    selectedUnit?: UnitStats | null;
    actionsRemaining?: number | null; 
    availableCards?: any[]; 
}

export function GameHUD({ 
    state, 
    sessionId, 
    onLeave, 
    onEndTurn,
    selectedUnit = { name: "Warrior", health: 100, attack: 10, defense: 5, movement: 3, attackRange: 1 }, 
    actionsRemaining = 2,
    // Expanded this mock array from 5 to 10 cards!
    availableCards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] 
}: GameHUDProps) {
    const isMyTurn = state.currentTurnId === sessionId && state.phase === "active";
    const players = state.players as unknown as Record<
        string,
        { sessionId: string; displayName: string }
    >;
    const activePlayer = players?.[state.currentTurnId];

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            
            {/* COMPACT TURN DISPLAY (Top Right) */}
            <div className="absolute top-8 left-[calc(50%+416px)] flex flex-col gap-2 bg-slate-900/90 border border-slate-700 p-3 rounded shadow-xl pointer-events-auto min-w-[180px] backdrop-blur-sm">
                <div className="text-slate-200 font-mono text-xs space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Phase:</span> 
                        <span className="font-bold text-emerald-400 uppercase">{state.phase}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Turn:</span> 
                        <span className="font-bold truncate max-w-[90px] text-right">
                            {isMyTurn ? "Your turn" : `${activePlayer?.displayName ?? "—"}`}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Round:</span> 
                        <span className="font-bold">{state.turnNumber + 1}</span>
                    </div>
                    
                    {actionsRemaining !== null && (
                        <div className="flex justify-between items-center border-t border-slate-700 pt-1 mt-1">
                            <span className="text-slate-400">Actions:</span> 
                            <span className="font-bold text-amber-400">{actionsRemaining}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex gap-1 mt-1">
                    <div className="flex-1 scale-90 origin-left">
                        <Button onClick={onEndTurn} disabled={!isMyTurn}>
                            End Turn
                        </Button>
                    </div>
                    <div className="scale-90 origin-right">
                        <Button onClick={onLeave}>
                            Leave
                        </Button>
                    </div>
                </div>
            </div>

            {/* COMPACT UNIT STATS (Top Left) */}
            {selectedUnit && (
                <div className="absolute top-8 right-[calc(50%+416px)] flex flex-col gap-1.5 bg-slate-900/90 border border-slate-700 p-3 rounded shadow-xl pointer-events-auto w-48 backdrop-blur-sm">
                    <h3 className="text-sm font-bold text-slate-100 border-b border-slate-700 pb-1">
                        {selectedUnit.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-1 text-xs font-mono text-slate-200">
                        <div className="flex justify-between bg-slate-800/80 px-1.5 py-1 rounded">
                            <span className="text-slate-400">HP</span> 
                            <span className="text-emerald-400 font-bold">{selectedUnit.health}</span>
                        </div>
                        <div className="flex justify-between bg-slate-800/80 px-1.5 py-1 rounded">
                            <span className="text-slate-400">ATK</span> 
                            <span className="text-rose-400 font-bold">{selectedUnit.attack}</span>
                        </div>
                        <div className="flex justify-between bg-slate-800/80 px-1.5 py-1 rounded">
                            <span className="text-slate-400">DEF</span> 
                            <span className="text-blue-400 font-bold">{selectedUnit.defense}</span>
                        </div>
                        <div className="flex justify-between bg-slate-800/80 px-1.5 py-1 rounded">
                            <span className="text-slate-400">MOV</span> 
                            <span className="text-amber-400 font-bold">{selectedUnit.movement}</span>
                        </div>
                        <div className="flex justify-between bg-slate-800/80 px-1.5 py-1 rounded col-span-2">
                            <span className="text-slate-400">RNG</span> 
                            <span className="text-purple-400 font-bold">{selectedUnit.attackRange}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* COMPACT CARDS (Bottom Center) */}
            {availableCards.length > 0 && (
                <div className="absolute top-[848px] left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
                    {availableCards.map((card, index) => (
                        <div 
                            key={index} 
                            className="w-20 h-28 bg-slate-800 border-2 border-slate-700 rounded-lg shadow-2xl flex flex-col items-center justify-center hover:-translate-y-2 hover:border-indigo-500 transition-all cursor-pointer group shrink-0"
                        >
                            <div className="w-full h-full border border-dashed border-slate-600 rounded m-1 flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                                <span className="text-slate-500 text-[10px] font-mono">Card {index + 1}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}