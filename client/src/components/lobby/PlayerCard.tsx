"use client";

interface Unit {
    name: string;
    hp: number;
    ad: number;
    def: number;
}

interface PlayerCardProps {
    name: string;
    rank: string;
    units: Unit[];
    isMe?: boolean;
    isReady?: boolean;
}

export function PlayerCard({ name, rank, units, isMe, isReady }: PlayerCardProps) {
    return (
        <div className={`border border-slate-700 bg-slate-900 rounded-xl p-6 shadow-xl flex flex-col relative overflow-hidden ${isMe ? 'ring-1 ring-indigo-500/50' : ''}`}>
            {isMe && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase">Local Tactician</div>}
            
            <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4 mt-2">
                <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center text-xl border border-slate-700 shadow-inner">👤</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-100">{name}</h3>
                    <div className="flex gap-2">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400`}>{rank}</span>
                        {isReady !== undefined && (
                            <span className={`text-xs font-mono px-2 py-0.5 rounded ${isReady ? 'bg-emerald-900/50 text-emerald-400' : 'bg-rose-900/50 text-rose-400'}`}>
                                {isReady ? "READY" : "NOT READY"}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Warband Configuration</h4>
                <div className="flex flex-col gap-2">
                    {units.map((unit, uIdx) => (
                        <div key={uIdx} className="bg-slate-950/50 border border-slate-800/80 p-3 rounded flex justify-between items-center">
                            <span className="font-bold text-sm text-slate-300">{unit.name}</span>
                            <div className="flex gap-4 text-xs font-mono">
                                <span className="text-slate-500"><strong className="text-emerald-400">{unit.hp}</strong> HP</span>
                                <span className="text-slate-500"><strong className="text-rose-400">{unit.ad}</strong> AD</span>
                                <span className="text-slate-500"><strong className="text-blue-400">{unit.def}</strong> DEF</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}