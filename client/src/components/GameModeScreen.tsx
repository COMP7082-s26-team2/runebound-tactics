interface GameModeScreenProps {
    onSingleplayer: () => void;
    onMultiplayer: () => void;
    onBack: () => void;
}

export default function GameModeScreen({ onSingleplayer, onMultiplayer, onBack }: GameModeScreenProps) {
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 flex flex-col items-center justify-center font-sans text-slate-200">
            
            <h1 className="text-4xl font-bold mb-16 text-slate-100 uppercase tracking-widest border-b border-indigo-500/30 pb-4">
                Select Mode
            </h1>

            <div className="flex flex-col gap-4 w-72">
                <button 
                    onClick={onSingleplayer}
                    className="bg-slate-800 hover:bg-indigo-600 text-slate-100 transition-all duration-300 py-4 px-6 rounded border border-slate-700 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] font-bold tracking-wider"
                >
                    Singleplayer
                </button>
                <button 
                    onClick={onMultiplayer}
                    className="bg-slate-800 hover:bg-indigo-600 text-slate-100 transition-all duration-300 py-4 px-6 rounded border border-slate-700 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] font-bold tracking-wider"
                >
                    Multiplayer
                </button>
                <button 
                    onClick={onBack}
                    className="mt-8 text-slate-500 hover:text-slate-300 transition-colors py-2 px-4 font-medium uppercase tracking-widest text-sm"
                >
                    ← Back to Menu
                </button>
            </div>

        </div>
    );
}