import { useState } from "react";

interface TacticalArenaProps {
    onExitGame: () => void;
}

// Defining our unit stats for the Unit Inspector
const UNIT_DATABASE: Record<string, { name: string; hp: number; ad: number; armor: number; role: string }> = {
    'A': { name: 'Ranger', hp: 500, ad: 65, armor: 20, role: 'Sharpshooter' },
    'C': { name: 'Cleric', hp: 600, ad: 40, armor: 30, role: 'Support' },
    'M': { name: 'Rune Mage', hp: 450, ad: 85, armor: 15, role: 'Spellcaster' },
    'S': { name: 'Swordsman', hp: 800, ad: 75, armor: 50, role: 'Vanguard' },
    'P': { name: 'Paladin', hp: 950, ad: 55, armor: 70, role: 'Vanguard' },
    'H': { name: 'Hunter', hp: 550, ad: 70, armor: 25, role: 'Sharpshooter' },
    'R': { name: 'Rogue', hp: 400, ad: 90, armor: 20, role: 'Assassin' },
};

export default function TacticalArena({ onExitGame }: TacticalArenaProps) {
    // UI Overlay States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    
    // Game Logic States for the Jira Ticket
    const [round, setRound] = useState(1);
    const [gold, setGold] = useState(40);
    const [actions, setActions] = useState(3);
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<"Blue" | "Red" | null>(null);

    const blueTeam = ['A', 'C', 'M', 'S', 'P'];
    const redTeam = ['H', 'C', 'R', 'S', 'P'];

    // Handle buying a strategy card
    const playCard = (cost: number) => {
        if (gold >= cost && actions > 0) {
            setGold(prev => prev - cost);
            setActions(prev => prev - 1);
        }
    };

    // Handle ending the turn
    const handleEndTurn = () => {
        const nextRound = round + 1;
        if (nextRound > 5) {
            setIsGameOver(true); // End the game after Round 5
        } else {
            setRound(nextRound);
            setActions(3); // Reset action points
            setGold(prev => prev + 5); // Add passive income per turn
            setSelectedUnit(null); // Clear inspector
        }
    };

    return (
        <div className="min-h-screen bg-stone-950 flex font-serif text-stone-300 relative">
            
            {/* Left Sidebar */}
            <aside className="w-64 bg-stone-900 border-r-4 border-amber-900 flex flex-col justify-between shadow-[5px_0_15px_rgba(0,0,0,0.5)] z-10 relative">
                <div className="p-6 flex flex-col gap-6">
                    <h2 className="text-xl font-black tracking-widest text-amber-500 uppercase">Menu</h2>
                    <nav className="flex flex-col gap-4 font-bold tracking-widest text-sm">
                        <button className="text-left text-amber-400 border-l-2 border-amber-400 pl-3">PLAY</button>
                        <button className="text-left text-stone-500 hover:text-stone-300 pl-3 transition-colors">DECKS</button>
                        <button className="text-left text-stone-500 hover:text-stone-300 pl-3 transition-colors">GUILDS</button>
                    </nav>
                </div>
                <div className="p-6">
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="text-stone-500 hover:text-stone-300 font-bold tracking-widest text-sm transition-colors"
                    >
                        SETTINGS
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-800 to-stone-950">
                
                {/* Top Header - Turn So Far */}
                <header className="h-16 border-b-2 border-stone-800 bg-stone-900/50 flex justify-between items-center px-8 shadow-md">
                    <div className="font-bold text-stone-400 tracking-widest uppercase">Tactical Arena</div>
                    <div className="font-black text-amber-500 tracking-widest text-xl">TIMER: 00:14</div>
                    <div className="font-bold text-amber-500 tracking-widest uppercase bg-stone-800 px-4 py-1 border border-stone-600 rounded-sm">
                        Round {round}
                    </div>
                </header>

                <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
                    
                    {/* The Tactical Grid */}
                    <div className="bg-stone-900/80 border-2 border-stone-700 shadow-2xl p-6 flex flex-col">
                        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Tactical Grid (10x5)</h3>
                        <div className="flex-1 flex items-center justify-center">
                            <div className="grid grid-cols-10 grid-rows-5 gap-1 bg-stone-800 p-1 border-2 border-stone-600 shadow-inner">
                                {Array.from({ length: 5 }).map((_, row) => (
                                    Array.from({ length: 10 }).map((_, col) => {
                                        let content: string | null = null;
                                        let cellStyle = "bg-stone-900 hover:bg-stone-700 transition-colors";
                                        let onClickHandler: (() => void) | undefined = undefined;
                                        
                                        if (col === 0) {
                                            content = blueTeam[row];
                                            const isSelected = selectedUnit === content && selectedTeam === "Blue";
                                            cellStyle = `bg-blue-900 border-2 cursor-pointer transition-all ${isSelected ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)] scale-105 z-10' : 'border-blue-500 hover:border-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]'} text-blue-100 font-black flex items-center justify-center relative`;
                                            onClickHandler = () => { setSelectedUnit(content); setSelectedTeam("Blue"); };
                                        } else if (col === 9) {
                                            content = redTeam[row];
                                            const isSelected = selectedUnit === content && selectedTeam === "Red";
                                            cellStyle = `bg-red-900 border-2 cursor-pointer transition-all ${isSelected ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)] scale-105 z-10' : 'border-red-500 hover:border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]'} text-red-100 font-black flex items-center justify-center relative`;
                                            onClickHandler = () => { setSelectedUnit(content); setSelectedTeam("Red"); };
                                        }

                                        return (
                                            <div key={`${row}-${col}`} className={`w-12 h-12 md:w-16 md:h-16 ${cellStyle}`} onClick={onClickHandler}>
                                                {content}
                                            </div>
                                        );
                                    })
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Dashboard Area */}
                    <div className="grid grid-cols-4 gap-4 h-40">
                        
                        {/* Unit Inspector */}
                        <div className="bg-stone-900/80 border-2 border-stone-700 p-4 shadow-lg flex flex-col">
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Unit Inspector</h3>
                            {selectedUnit && UNIT_DATABASE[selectedUnit] ? (
                                <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-200">
                                    <div className="flex justify-between items-start border-b border-stone-700 pb-2">
                                        <div>
                                            <div className={`font-black uppercase tracking-wider ${selectedTeam === 'Blue' ? 'text-blue-400' : 'text-red-400'}`}>
                                                {UNIT_DATABASE[selectedUnit].name}
                                            </div>
                                            <div className="text-xs text-stone-500">{UNIT_DATABASE[selectedUnit].role}</div>
                                        </div>
                                        <div className="text-lg font-bold text-emerald-500">{UNIT_DATABASE[selectedUnit].hp} HP</div>
                                    </div>
                                    <div className="grid grid-cols-2 text-sm mt-2">
                                        <div><span className="text-stone-500">AD:</span> <span className="text-amber-500 font-bold">{UNIT_DATABASE[selectedUnit].ad}</span></div>
                                        <div><span className="text-stone-500">Armor:</span> <span className="text-stone-300 font-bold">{UNIT_DATABASE[selectedUnit].armor}</span></div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-stone-400 italic mt-4 text-center">Select a unit on the grid to view combat stats.</p>
                            )}
                        </div>

                        {/* Resources */}
                        <div className="bg-stone-900/80 border-2 border-stone-700 p-4 shadow-lg flex flex-col justify-center">
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Resources</h3>
                            <div className="text-4xl font-black text-amber-500 drop-shadow-md transition-all">{gold} G</div>
                            <div className="text-sm font-bold text-stone-400 mt-1">0 PTS</div>
                        </div>

                        {/* Actions */}
                        <div className="bg-stone-900/80 border-2 border-stone-700 p-4 shadow-lg flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest self-start w-full z-10">Actions</h3>
                            
                            {/* Dynamic Action Dots */}
                            <div className="flex gap-2 z-10">
                                {[1, 2, 3].map((dot) => (
                                    <div key={dot} className={`w-5 h-5 rounded-full transition-all duration-300 ${dot <= actions ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-stone-800 border border-stone-600'}`}></div>
                                ))}
                            </div>
                            
                            <button 
                                onClick={handleEndTurn}
                                className="bg-blue-700 hover:bg-blue-600 border border-blue-400 text-blue-100 font-bold text-sm px-6 py-1 w-full transition-colors shadow-md uppercase tracking-widest z-10 active:scale-95"
                            >
                                End Turn
                            </button>
                        </div>

                        {/* Strategy Deck */}
                        <div className="bg-stone-900/80 border-2 border-stone-700 p-4 shadow-lg flex flex-col">
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Strategy Deck</h3>
                            <div className="flex gap-2 flex-1 items-end">
                                {[
                                    { name: "Strike", cost: 5 },
                                    { name: "Heal", cost: 4 },
                                    { name: "Haste", cost: 3 }
                                ].map((card, idx) => {
                                    const canAfford = gold >= card.cost && actions > 0;
                                    return (
                                        <button 
                                            key={idx} 
                                            onClick={() => playCard(card.cost)}
                                            disabled={!canAfford}
                                            className={`flex-1 border h-20 flex flex-col items-center justify-center transition-all shadow-md group ${canAfford ? 'bg-stone-800 border-stone-500 hover:-translate-y-2 cursor-pointer hover:border-amber-500' : 'bg-stone-950 border-stone-800 opacity-50 cursor-not-allowed'}`}
                                        >
                                            <div className={`text-xs font-bold uppercase ${canAfford ? 'text-stone-200 group-hover:text-amber-400' : 'text-stone-600'}`}>{card.name}</div>
                                            <div className={`text-xs mt-1 ${canAfford ? 'text-amber-500' : 'text-stone-700'}`}>{card.cost} G</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Settings Modal */}
            {isSettingsOpen && !isGameOver && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-stone-950 border-4 border-amber-900 max-w-2xl w-full shadow-[0_0_50px_rgba(0,0,0,1)] flex flex-col">
                        <div className="border-b-2 border-stone-800 p-6 flex justify-between items-center bg-stone-900">
                            <h2 className="text-3xl font-black tracking-widest text-amber-500 uppercase flex items-center gap-3">
                                <span>⚙️</span> Realm Settings
                            </h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-stone-500 hover:text-red-500 text-4xl font-black transition-colors">&times;</button>
                        </div>
                        <div className="p-8 flex flex-col gap-6">
                            <div>
                                <h3 className="text-xl font-bold text-amber-700 border-b border-stone-800 pb-2 mb-6 uppercase tracking-widest">Acoustics</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-6">
                                        <label className="text-xs uppercase tracking-widest text-stone-400 font-bold w-32">Master Volume</label>
                                        <div className="flex-1 h-3 bg-stone-900 border border-stone-700 relative"><div className="absolute top-0 left-0 h-full w-[80%] bg-amber-600"></div></div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <label className="text-xs uppercase tracking-widest text-stone-400 font-bold w-32">Battle Music</label>
                                        <div className="flex-1 h-3 bg-stone-900 border border-stone-700 relative"><div className="absolute top-0 left-0 h-full w-[60%] bg-stone-500"></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="border-t-2 border-stone-800 p-6 flex justify-between items-center bg-stone-900">
                            <button onClick={() => { setIsSettingsOpen(false); setIsGameOver(true); }} className="px-6 py-3 bg-stone-800 hover:bg-red-950 border-2 border-stone-600 hover:border-red-900 text-stone-400 hover:text-red-500 font-bold uppercase tracking-widest transition-all">
                                Surrender
                            </button>
                            <button onClick={() => setIsSettingsOpen(false)} className="px-10 py-3 bg-stone-800 hover:bg-stone-700 border-2 border-amber-700 text-amber-500 font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(180,83,9,0.3)] transition-all">
                                Resume Battle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over / Defeat Modal */}
            {isGameOver && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                    <div className="max-w-xl w-full flex flex-col items-center gap-8 text-center animate-in fade-in zoom-in duration-500">
                        <div className="text-7xl drop-shadow-[0_0_30px_rgba(220,38,38,0.8)]">☠️</div>
                        <div>
                            <h1 className="text-6xl font-black tracking-[0.3em] text-red-600 uppercase drop-shadow-[0_5px_5px_rgba(0,0,0,1)]">Defeat</h1>
                            <p className="text-stone-400 text-lg mt-4 italic">Your forces have been scattered to the winds.</p>
                        </div>
                        <div className="bg-stone-900/80 border-y-2 border-red-900 w-full py-6 px-8 flex justify-between shadow-[0_0_20px_rgba(0,0,0,1)] mt-4">
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Placement</span>
                                <span className="text-3xl font-black text-stone-300">8th</span>
                            </div>
                            <div className="flex flex-col items-center border-x border-stone-700 px-8">
                                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Rounds Survived</span>
                                <span className="text-3xl font-black text-stone-300">{round}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Rating</span>
                                <span className="text-3xl font-black text-red-500">-32 LP</span>
                            </div>
                        </div>
                        <button onClick={onExitGame} className="mt-6 px-12 py-4 bg-stone-900 hover:bg-stone-800 border-2 border-red-900 text-red-500 hover:text-red-400 font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(153,27,27,0.4)] transition-all group">
                            <span className="group-hover:tracking-[0.2em] transition-all duration-300">Return to Keep</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}