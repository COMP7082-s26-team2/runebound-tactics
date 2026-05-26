interface MultiplayerScreenProps {
    onFindLobby: () => void;
    onBack: () => void;
}

export default function MultiplayerScreen({ onFindLobby, onBack }: MultiplayerScreenProps) {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans text-black">
            
            <h1 className="text-4xl font-normal mb-20">
                Multiplayer
            </h1>

            <div className="flex flex-col gap-4 w-48">
                <button 
                    className="bg-[#e5e5e5] hover:bg-[#d4d4d4] transition-colors py-2 px-4 rounded-md shadow-sm text-center"
                >
                    Create a Lobby
                </button>
                <button 
                    onClick={onFindLobby}
                    className="bg-[#e5e5e5] hover:bg-[#d4d4d4] transition-colors py-2 px-4 rounded-md shadow-sm text-center"
                >
                    Find a Lobby
                </button>
                <button 
                    className="bg-[#e5e5e5] hover:bg-[#d4d4d4] transition-colors py-2 px-4 rounded-md shadow-sm text-center"
                >
                    Enter Lobby ID
                </button>
                <button 
                    onClick={onBack}
                    className="bg-[#e5e5e5] hover:bg-[#d4d4d4] transition-colors py-2 px-4 rounded-md shadow-sm text-center mt-2"
                >
                    Back
                </button>
            </div>

        </div>
    );
}