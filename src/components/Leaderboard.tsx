interface LeaderboardProps {
    onBackClick: () => void;
}

export default function Leaderboard({ onBackClick }: LeaderboardProps) {
    const topPlayers = [
        { rank: 1, name: "EconKing", lp: "1250 LP", tier: "Grandmaster" },
        { rank: 2, name: "SlowRoller", lp: "1120 LP", tier: "Grandmaster" },
        { rank: 3, name: "Zephyrus", lp: "980 LP", tier: "Master" },
        { rank: 4, name: "GarenMain", lp: "840 LP", tier: "Master" },
        { rank: 5, name: "TacticianPrime", lp: "710 LP", tier: "Diamond I" },
    ];

    return (
        <div className="min-h-screen bg-stone-950 flex flex-col font-serif text-stone-300 items-center py-16 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-900 to-stone-950">
            <div className="w-full max-w-4xl flex flex-col gap-8 z-10 px-8">
                
                <div className="flex justify-between items-center border-b-2 border-amber-900 pb-4">
                    <h1 className="text-4xl font-black tracking-widest text-amber-500 uppercase flex items-center gap-4">
                        <span className="text-5xl">👑</span> Kingdom Leaderboard
                    </h1>
                    <button 
                        onClick={onBackClick}
                        className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest rounded-sm border-2 border-stone-600 transition-all"
                    >
                        Return to Keep
                    </button>
                </div>

                <div className="bg-stone-900/80 border-2 border-stone-700 shadow-2xl p-2">
                    {/* Header Row */}
                    <div className="grid grid-cols-4 text-amber-700 font-bold uppercase tracking-widest text-sm p-4 border-b border-stone-800">
                        <div>Rank</div>
                        <div className="col-span-2">Tactician</div>
                        <div className="text-right">Rating</div>
                    </div>

                    {/* Player Rows */}
                    {topPlayers.map((player) => (
                        <div key={player.rank} className="grid grid-cols-4 items-center p-4 border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors">
                            <div className={`text-2xl font-black ${player.rank <= 3 ? 'text-amber-400' : 'text-stone-500'}`}>
                                #{player.rank}
                            </div>
                            <div className="col-span-2 font-bold text-lg text-stone-200">
                                {player.name}
                                <span className="block text-xs text-stone-500 font-normal">{player.tier}</span>
                            </div>
                            <div className="text-right font-bold text-amber-500">
                                {player.lp}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}