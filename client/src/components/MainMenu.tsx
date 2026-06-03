interface MainMenuProps {
    onStart: () => void;
}

export default function MainMenu({ onStart }: MainMenuProps) {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans text-black">
            
            <h1 className="text-5xl font-normal mb-20">
                Runebound Tactics
            </h1>

            <div className="flex flex-col gap-4 w-48">
                <button 
                    onClick={onStart}
                    className="bg-[#e5e5e5] hover:bg-[#d4d4d4] transition-colors py-2 px-4 rounded-md shadow-sm text-center"
                >
                    Start
                </button>
                <button 
                    className="bg-[#e5e5e5] hover:bg-[#d4d4d4] transition-colors py-2 px-4 rounded-md shadow-sm text-center"
                >
                    Options
                </button>
                <button 
                    className="bg-[#e5e5e5] hover:bg-[#d4d4d4] transition-colors py-2 px-4 rounded-md shadow-sm text-center"
                >
                    Quit
                </button>
            </div>

        </div>
    );
}