interface MatchHistoryProps {
    onBackClick: () => void;
}

export default function MatchHistory({ onBackClick }: MatchHistoryProps) {
    const matches = [
        { place: "1st", lp: "+42 LP", comp: "Slow Roll Vanguard", length: "34:12", color: "text-amber-400", border: "border-amber-600", bg: "bg-amber-900/10" },
        { place: "3rd", lp: "+18 LP", comp: "Fast 8 Spellcaster", length: "29:45", color: "text-stone-300", border: "border-stone-500", bg: "bg-stone-800/30" },
        { place: "8th", lp: "-35 LP", comp: "Forced Rangers", length: "15:20", color: "text-stone-500", border: "border-red-900/50", bg: "bg-red-950/20" },
    ];

    return (
        <div className="min-h-screen bg-stone-950 flex flex-col font-serif text-stone-300 items-center py-16 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-900 to-stone-950">
            <div className="w-full max-w-4xl flex flex-col gap-8 z-10 px-8">
                
                <div className="flex justify-between items-center border-b-2 border-amber-900 pb-4">
                    <h1 className="text-4xl font-black tracking-widest text-amber-500 uppercase flex items-center gap-4">
                        <span className="text-5xl">📜</span> Match History
                    </h1>
                    <button 
                        onClick={onBackClick}
                        className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest rounded-sm border-2 border-stone-600 transition-all"
                    >
                        Return to Keep
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    {matches.map((match, index) => (
                        <div key={index} className={`border-l-4 ${match.border} ${match.bg} p-6 shadow-lg flex justify-between items-center hover:bg-opacity-80 transition-all`}>
                            <div className="flex items-center gap-8">
                                <div className={`text-4xl font-black ${match.color} w-16 text-center`}>
                                    {match.place}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-stone-200">{match.comp}</h3>
                                    <p className="text-sm text-stone-500">Duration: {match.length}</p>
                                </div>
                            </div>
                            <div className={`text-2xl font-bold ${match.lp.includes('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                                {match.lp}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}