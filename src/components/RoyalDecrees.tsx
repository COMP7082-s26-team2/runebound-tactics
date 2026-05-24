interface RoyalDecreesProps {
    onBackClick: () => void;
}

export default function RoyalDecrees({ onBackClick }: RoyalDecreesProps) {
    return (
        <div className="min-h-screen bg-stone-950 flex flex-col font-serif text-stone-300 items-center py-16 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-900 to-stone-950">
            <div className="w-full max-w-4xl flex flex-col gap-8 z-10 px-8">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-amber-900 pb-4">
                    <h1 className="text-4xl font-black tracking-widest text-amber-500 uppercase flex items-center gap-4">
                        <span className="text-5xl">🛡️</span> Royal Decrees
                    </h1>
                    <button 
                        onClick={onBackClick}
                        className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest rounded-sm border-2 border-stone-600 transition-all"
                    >
                        Return to Keep
                    </button>
                </div>

                <div className="flex flex-col gap-8">
                    {/* Latest Patch (Featured) */}
                    <div className="bg-stone-900/90 border-2 border-amber-600 shadow-[0_0_20px_rgba(180,83,9,0.2)] p-8 relative">
                        <div className="absolute top-0 right-0 bg-amber-700 text-stone-100 font-bold uppercase tracking-widest text-xs px-4 py-1 rounded-bl-lg shadow-md">
                            Latest Parchment
                        </div>
                        
                        <h2 className="text-3xl font-black text-amber-500 mb-2 border-b border-stone-700 pb-4">
                            Patch 1.2.0 - The Dragon's Awakening
                        </h2>
                        
                        <div className="mt-6 space-y-6">
                            {/* System Changes */}
                            <div>
                                <h3 className="text-xl font-bold text-stone-200 mb-2 flex items-center gap-2">
                                    <span className="text-amber-600">⚖️</span> System Changes
                                </h3>
                                <ul className="list-disc list-inside text-stone-400 space-y-1 ml-2">
                                    <li>Adjusted tavern shop odds at Level 7 to slightly reduce the dominance of 3-cost slow roll strategies.</li>
                                    <li>Base player damage taken in Stage 4 increased from 4 to 5.</li>
                                </ul>
                            </div>

                            {/* Trait Balancing */}
                            <div>
                                <h3 className="text-xl font-bold text-stone-200 mb-2 flex items-center gap-2">
                                    <span className="text-amber-600">✨</span> Trait Balancing
                                </h3>
                                <ul className="list-disc list-inside text-stone-400 space-y-1 ml-2">
                                    <li><strong className="text-stone-300">Vanguard:</strong> Armor bonus reduced from 40/80/120 to 30/70/110.</li>
                                    <li><strong className="text-stone-300">Spellcaster:</strong> Mana regeneration per second increased from 3 to 5 at 4-piece synergy.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder for New / Upcoming Patch */}
                    <div className="bg-stone-900/50 border-2 border-stone-700 border-dashed p-8 text-center flex flex-col items-center justify-center opacity-80">
                        <span className="text-4xl mb-4 grayscale opacity-50">📜</span>
                        <h3 className="text-xl font-bold text-stone-400 mb-2">Upcoming Decree: Patch 1.3.0</h3>
                        <p className="text-sm text-stone-500 max-w-md">
                            The royal scribes are currently drafting the next set of kingdom updates. Expect major overhauls to the Ranger trait and new artifacts.
                        </p>
                    </div>

                    {/* Older Patch Archive */}
                    <div className="bg-stone-900 border border-stone-800 p-6 flex justify-between items-center hover:border-stone-600 transition-colors cursor-pointer">
                        <div>
                            <h3 className="text-lg font-bold text-stone-300">Patch 1.1.5 - Stability Fixes</h3>
                            <p className="text-sm text-stone-500">Minor bug fixes and matchmaking improvements.</p>
                        </div>
                        <div className="text-amber-700 font-bold">Read &rarr;</div>
                    </div>
                </div>
            </div>
        </div>
    );
}