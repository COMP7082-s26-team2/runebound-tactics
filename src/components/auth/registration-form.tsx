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
        const password = formData.get('password') as string;

        // Client-side Password Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(password)) {
            setError('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.');
            setLoading(false);
            return;
        }

        const result = await signUp(formData);

        setLoading(false);

        if (result?.error) {
            setError(result.error);
        } else if (result?.success) {
            setSuccess(result.message || 'A verification email has been sent. Please confirm your email to finalize registration.');
            (event.target as HTMLFormElement).reset();
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
                    className="w-full bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm focus:outline-none focus:border-[#555555] transition-colors"
                    placeholder="••••••••"
                />
                <p className="text-[9px] text-[#444444] leading-tight">
                    Must be 8+ chars with uppercase, lowercase, digit, and symbol (@$!%*?&#)
                </p>
            </div>

            {error && (
                <div className="p-3 bg-[#2d1111] border border-[#4d2222] text-[#ff6666] text-[10px] font-medium uppercase tracking-tight leading-normal">
                    Error: {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-[#112d11] border border-[#224d22] text-[#66ff66] text-xs font-bold uppercase tracking-tight leading-relaxed">
                    SUCCESS: {success}
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
