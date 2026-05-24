interface LoginModalProps {
    onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-serif text-stone-300">
            {/* The Modal Box */}
            <div className="bg-stone-900 border-4 border-amber-900 shadow-[0_0_40px_rgba(0,0,0,0.9)] max-w-sm w-full relative">
                
                {/* Close Button (Top Right) */}
                <button 
                    onClick={onClose}
                    className="absolute top-2 right-4 text-stone-500 hover:text-red-500 text-3xl font-black transition-colors"
                >
                    &times;
                </button>
                
                <div className="p-8 flex flex-col gap-6">
                    {/* Header */}
                    <div className="text-center">
                        <span className="text-4xl">🗝️</span>
                        <h2 className="text-3xl font-black tracking-widest text-amber-500 uppercase mt-2">
                            Enter the Keep
                        </h2>
                        <p className="text-stone-500 text-sm mt-1">
                            Provide your credentials to access the realm.
                        </p>
                    </div>

                    {/* Form Fields */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs uppercase tracking-widest text-amber-700 font-bold">
                                Tactician Name
                            </label>
                            <input 
                                type="text" 
                                className="bg-stone-950 border-2 border-stone-700 px-4 py-2 text-stone-200 focus:outline-none focus:border-amber-600 transition-colors"
                                placeholder="Enter your alias..."
                            />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <label className="text-xs uppercase tracking-widest text-amber-700 font-bold">
                                Secret Cipher
                            </label>
                            <input 
                                type="password" 
                                className="bg-stone-950 border-2 border-stone-700 px-4 py-2 text-stone-200 focus:outline-none focus:border-amber-600 transition-colors"
                                placeholder="Enter your password..."
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button className="w-full py-3 bg-red-950 hover:bg-red-900 border-2 border-amber-700 text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest transition-colors mt-2 shadow-[0_0_15px_rgba(180,83,9,0.3)]">
                        Authenticate
                    </button>
                </div>
            </div>
        </div>
    );
}