interface MainMenuProps {
    onPlayClick: () => void;
    onLeaderboardClick: () => void;
    onHistoryClick: () => void;
    onDecreesClick: () => void;
    onLoginClick: () => void; // <-- 1. Add this to the interface
}

export default function MainMenu({ onPlayClick, onLeaderboardClick, onHistoryClick, onDecreesClick, onLoginClick }: MainMenuProps) { // <-- 2. Add it here
    return (
        <div className="min-h-screen bg-stone-950 flex flex-col font-serif text-stone-300">
            <nav className="w-full bg-stone-900 border-b-4 border-amber-900 p-4 flex justify-end items-center shadow-2xl relative z-10">
                {/* 3. Add the onClick event to the login button */}
                <button 
                    onClick={onLoginClick}
                    className="px-8 py-2 bg-stone-800 hover:bg-stone-700 text-amber-500 hover:text-amber-400 font-bold rounded-sm border-2 border-amber-700 transition-all"
                >
                    LOGIN
                </button>
            </nav>

            <main className="flex-grow flex items-center justify-center p-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-800 via-stone-950 to-stone-950 relative overflow-hidden">
                <div className="max-w-6xl w-full flex flex-col items-center gap-12 relative z-10">
                    
                    <div className="flex flex-col items-center gap-4 text-center select-none">
                        <div className="flex items-center gap-6 text-amber-700 drop-shadow-md">
                            <span className="text-3xl">⚜</span>
                            <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
                            <span className="text-4xl">⚔</span>
                            <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
                            <span className="text-3xl">⚜</span>
                        </div>
                        
                        <h1 className="text-7xl md:text-8xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-600 to-amber-900 drop-shadow-[0_5px_5px_rgba(0,0,0,1)] uppercase py-2">
                            Runebound<br />Tactics
                        </h1>
                        
                        <div className="flex items-center gap-6 text-amber-700 mt-2">
                            <div className="h-px w-64 bg-gradient-to-r from-transparent via-amber-700 to-transparent"></div>
                        </div>
                    </div>

                    <button 
                        onClick={onPlayClick} 
                        className="group relative px-24 py-8 bg-red-950 hover:bg-red-900 transition-all duration-300 border-4 border-amber-600 shadow-[0_0_30px_rgba(180,83,9,0.4)] hover:shadow-[0_0_50px_rgba(180,83,9,0.7)] rounded-sm overflow-hidden mt-4"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <span className="relative text-6xl font-black tracking-[0.2em] text-amber-500 group-hover:text-amber-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                            PLAY
                        </span>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-8">
                        <div onClick={onLeaderboardClick} className="bg-stone-900 border-2 border-stone-700 p-6 hover:border-amber-600 transition-colors cursor-pointer group shadow-lg relative">
                            <div className="absolute inset-0 bg-amber-900/5 group-hover:bg-amber-900/20 transition-colors"></div>
                            <h3 className="relative text-xl font-bold text-amber-600 mb-2 group-hover:text-amber-500 flex items-center gap-2">
                                <span className="text-2xl">👑</span> Leaderboard
                            </h3>
                            <p className="relative text-sm text-stone-400">View the most legendary tacticians across the kingdom.</p>
                        </div>

                        <div onClick={onHistoryClick} className="bg-stone-900 border-2 border-stone-700 p-6 hover:border-amber-600 transition-colors cursor-pointer group shadow-lg relative">
                            <div className="absolute inset-0 bg-amber-900/5 group-hover:bg-amber-900/20 transition-colors"></div>
                            <h3 className="relative text-xl font-bold text-amber-600 mb-2 group-hover:text-amber-500 flex items-center gap-2">
                                <span className="text-2xl">📜</span> Match History
                            </h3>
                            <p className="relative text-sm text-stone-400">Consult the archives of your past triumphs and defeats.</p>
                        </div>

                        {/* Added onClick here */}
                        <div onClick={onDecreesClick} className="bg-stone-900 border-2 border-stone-700 p-6 hover:border-amber-600 transition-colors cursor-pointer group shadow-lg relative">
                            <div className="absolute inset-0 bg-amber-900/5 group-hover:bg-amber-900/20 transition-colors"></div>
                            <h3 className="relative text-xl font-bold text-amber-600 mb-2 group-hover:text-amber-500 flex items-center gap-2">
                                <span className="text-2xl">🛡️</span> Royal Decrees
                            </h3>
                            <p className="relative text-sm text-stone-400">Read the latest parchment regarding kingdom balance.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}