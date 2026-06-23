"use client";

import { useState } from "react";
import { logIn } from "@/app/auth/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Hint } from "@/components/ui/Hint";

export default function LoginForm() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

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
            return;
        }
        if (result?.success) {
            window.location.href = "/";
        }
    }

    return (
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                autoComplete="email"
                skin="chamber"
            />
            <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
                skin="chamber"
            />

            {error && <Hint tone="error">{error}</Hint>}

            <Button type="submit" intent="primary" disabled={loading} className="w-full">
                {loading ? "Authenticating…" : "Enter"}
            </Button>

            <a
                href="/auth/signup"
                className="text-center text-[var(--text-xs)] uppercase tracking-[0.16em] font-[family-name:var(--font-pxcap)] text-[var(--ink-500)] hover:text-[var(--vellum-050)] transition-colors"
            >
                No seal yet? Inscribe one.
            </a>
        </form>
    );
}
