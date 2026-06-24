"use client";

import { useState } from "react";
import { logIn } from "@/lib/auth/actions";

export default function LoginForm() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: "", password: "" });

    async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const { email, password } = formData;

        if (!email || !password) {
            setError("Please enter both email and password.");
            setLoading(false);
            return;
        }

        const loginData = new FormData();
        loginData.append("email", email);
        loginData.append("password", password);

        const result = await logIn(loginData);

        setLoading(false);

        if (result?.error) {
            setError(result.error);
        } else if (result?.success) {
            setSuccess('Authentication successful! Entering the realm...');
            window.location.href = '/';
        }
    }

    return (
        <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.55">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">
                    Email
                </label>
                <input
                    key="login-email-input"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                        setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                        }))
                    }
                    className="w-full bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm focus:outline-none focus:border-[#555555] transition-colors text-white"
                    placeholder="youremail@email.com"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-bold">
                    Password
                </label>
                <input
                    key="login-password-input"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) =>
                        setFormData((prev) => ({
                            ...prev,
                            password: e.target.value,
                        }))
                    }
                    className="w-full bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm focus:outline-none focus:border-[#555555] transition-colors text-white"
                    placeholder="••••••••"
                />
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
                {loading ? "Authenticating..." : "LOGIN"}
            </button>

            <div className="text-center mt-4">
                <a
                    href="/auth/signup"
                    className="text-[9px] uppercase tracking-[0.1em] text-[#555555] hover:text-[#777777] transition-colors"
                >
                    Don't have an account? Sign up
                </a>
            </div>
        </form>
    );
}
