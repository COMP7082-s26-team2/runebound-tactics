'use client';

import { useState } from 'react';
import { signUp } from '@/app/auth/actions';

export default function RegistrationForm() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData(event.currentTarget);
        const result = await signUp(formData);

        setLoading(false);

        if (result?.error) {
            setError(result.error);
        } else if (result?.success) {
            setSuccess(result.message || 'Check your email to verify your account.');
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">Username</label>
                <input
                    name="username"
                    type="text"
                    required
                    className="w-full bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm focus:outline-none focus:border-[#555555] transition-colors"
                    placeholder="your username"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">Email</label>
                <input
                    name="email"
                    type="email"
                    required
                    className="w-full bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm focus:outline-none focus:border-[#555555] transition-colors"
                    placeholder="youremail@email.com"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">Password</label>
                <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    className="w-full bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm focus:outline-none focus:border-[#555555] transition-colors"
                    placeholder="••••••••"
                />
            </div>

            {error && (
                <div className="p-3 bg-[#2d1111] border border-[#4d2222] text-[#ff6666] text-xs font-medium uppercase tracking-tight">
                    Error: {error}
                </div>
            )}

            {success && (
                <div className="p-3 bg-[#112d11] border border-[#224d22] text-[#66ff66] text-xs font-medium uppercase tracking-tight">
                    {success}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full h-12 bg-[#333333] hover:bg-[#444444] text-white font-bold uppercase tracking-widest text-xs transition-colors disabled:opacity-50"
            >
                {loading ? 'Initializing...' : 'JOIN'}
            </button>
        </form>
    );
}
