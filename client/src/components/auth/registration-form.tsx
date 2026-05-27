'use client';

import { useState } from 'react';
import { signUp, verifyOtp } from '@/app/auth/actions';

export default function RegistrationForm() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'signup' | 'verify'>('signup');
    const [regData, setRegData] = useState({ email: '', username: '' });

    const [formData, setFormData] = useState({ username: '', email: '', password: '' });

    async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const { username, email, password } = formData;

        // Client-side Password Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(password)) {
            setError('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.');
            setLoading(false);
            return;
        }

        const signupData = new FormData();
        signupData.append('email', email);
        signupData.append('username', username);
        signupData.append('password', password);

        const result = await signUp(signupData);

        setLoading(false);

        if (result?.error) {
            setError(result.error);
        } else if (result?.success) {
            setRegData({ email, username });
            setStep('verify');
            setSuccess(result.message);
        }
    }

    const [otpCode, setOtpCode] = useState('');

    async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const result = await verifyOtp(regData.email, otpCode, regData.username);

        setLoading(false);

        if (result?.error) {
            setError(result.error);
        } else if (result?.success) {
            setSuccess('Verification successful! Entering the realm...');
            window.location.href = '/';
        }
    }

    if (step === 'verify') {
        return (
            <form key="verify-form" onSubmit={handleVerify} className="space-y-5">
                <div className="space-y-1.5 text-center mb-6">
                    <p className="text-[10px] uppercase tracking-widest text-[#999999]">
                        Enter the 8-digit code sent to
                    </p>
                    <p className="text-xs font-bold text-[#66ff66]">{regData.email}</p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">Verification Code</label>
                    <input
                        key="otp-input"
                        name="code"
                        type="text"
                        required
                        maxLength={8}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        autoComplete="off"
                        className="w-full bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-center text-xl tracking-[0.3em] font-mono focus:outline-none focus:border-[#555555] transition-colors"
                        placeholder="00000000"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-[#2d1111] border border-[#4d2222] text-[#ff6666] text-[10px] font-medium uppercase tracking-tight leading-normal">
                        Error: {error}
                    </div>
                )}

                {success && (
                    <div className="p-4 bg-[#112d11] border border-[#224d22] text-[#66ff66] text-xs font-bold uppercase tracking-tight leading-relaxed">
                        {success}
                    </div>
                )}

                <button
                    disabled={loading}
                    className="w-full h-12 bg-[#333333] hover:bg-[#444444] text-white font-bold uppercase tracking-widest text-xs transition-colors disabled:opacity-50"
                >
                    {loading ? 'Verifying...' : 'VERIFY CODE'}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setStep('signup');
                        setOtpCode('');
                    }}
                    className="w-full text-[9px] uppercase tracking-[0.1em] text-[#555555] hover:text-[#777777] transition-colors"
                >
                    Wrong email? Go back
                </button>
            </form>
        );
    }

    return (
        <form key="signup-form" onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">Username</label>
                <input
                    key="username-input"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm focus:outline-none focus:border-[#555555] transition-colors"
                    placeholder="your username"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">Email</label>
                <input
                    key="email-input"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm focus:outline-none focus:border-[#555555] transition-colors"
                    placeholder="youremail@email.com"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">Password</label>
                <input
                    key="password-input"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
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
