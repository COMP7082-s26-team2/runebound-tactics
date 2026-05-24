import { useState, useEffect } from "react";

interface LoadingScreenProps {
    onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [progress, setProgress] = useState(0);

    // This hook runs exactly once when the component mounts
    useEffect(() => {
        // Set up a timer to increase progress by 1% every 30 milliseconds
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 30); // Adjust this number to make loading faster or slower

        // Cleanup the interval when the component is removed
        return () => clearInterval(interval);
    }, []);

    // This hook watches the progress variable. If it hits 100, trigger onComplete.
    useEffect(() => {
        if (progress === 100) {
            // A tiny 300ms delay so the user actually sees the bar hit 100%
            const timeout = setTimeout(() => {
                onComplete();
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [progress, onComplete]);

    return (
        <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center font-serif text-stone-300 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-900 to-stone-950">
            
            <div className="flex flex-col items-center gap-10 relative z-10 w-full max-w-lg px-8">
                
                {/* Pulsing Emblem */}
                <div className="relative animate-pulse flex items-center justify-center">
                    <div className="absolute w-32 h-32 bg-amber-600 rounded-full blur-3xl opacity-20"></div>
                    <span className="text-7xl text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] select-none">
                        ⚔️
                    </span>
                </div>

                {/* Loading Text */}
                <div className="text-center">
                    <h2 className="text-3xl font-black tracking-widest text-amber-600 uppercase mb-2 drop-shadow-md">
                        Preparing the Battlefield
                    </h2>
                    <p className="text-sm text-stone-500 italic">
                        Summoning assets from the royal archives... {progress}%
                    </p>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full h-5 bg-stone-900 border-2 border-stone-700 rounded-sm overflow-hidden relative shadow-[inset_0_4px_6px_rgba(0,0,0,0.8)]">
                    {/* The Animated Gold Fill - Width is controlled dynamically by the progress state */}
                    <div 
                        className="h-full bg-gradient-to-r from-red-950 via-amber-700 to-amber-400 relative shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>

                {/* Game Tip Archive */}
                <div className="mt-4 text-center bg-stone-900/80 border border-stone-800 py-4 px-8 rounded-sm w-full shadow-lg relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-950 px-2 text-amber-800">
                        ⚜
                    </div>
                    <span className="text-amber-700 font-bold text-xs uppercase tracking-widest block mb-2 mt-1">
                        Tactician's Tip
                    </span>
                    <p className="text-stone-400 text-sm leading-relaxed">
                        Managing your gold economy is just as important as upgrading your champions. Save your coin for interest if the tavern offers poor recruits.
                    </p>
                </div>

            </div>
        </div>
    );
}