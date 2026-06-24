"use client";

import { useState } from "react";
// import { signUp, verifyOtp } from "@/app/auth/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Hint } from "@/components/ui/Hint";
import { Eyebrow } from "@/components/ui/Eyebrow";

const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
import { signUp, verifyOtp } from "@/lib/auth/actions";

export default function RegistrationForm() {
    const [step, setStep] = useState<"signup" | "verify">("signup");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");

    async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        if (!PASSWORD_REGEX.test(password)) {
            setError(
                "Password must be 8+ characters and include an uppercase letter, lowercase letter, digit, and one of @ $ ! % * ? & #.",
            );
            setLoading(false);
            return;
        }

        const data = new FormData();
        data.append("email", email);
        data.append("username", username);
        data.append("password", password);

        const result = await signUp(data);
        setLoading(false);

        if (result?.error) {
            setError(result.error);
            return;
        }
        if (result?.success) {
            setStep("verify");
        }
    }

    async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const result = await verifyOtp(email, otp, username);
        setLoading(false);

        if (result?.error) {
            setError(result.error);
            return;
        }
        if (result?.success) {
            window.location.href = "/";
        }
    }

    if (step === "verify") {
        return (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <div className="text-center flex flex-col gap-1">
                    <Eyebrow className="text-[var(--ink-500)]">Step 2 of 2 — Verify</Eyebrow>
                    <Hint>
                        We sent an 8-digit code to <span className="text-[var(--vellum-050)] font-bold">{email}</span>.
                    </Hint>
                </div>

                <Field
                    label="Verification code"
                    type="text"
                    value={otp}
                    onChange={setOtp}
                    placeholder="00000000"
                    maxLength={8}
                    autoComplete="one-time-code"
                    skin="chamber"
                />

                {error && <Hint tone="error">{error}</Hint>}

                <Button type="submit" intent="primary" disabled={loading} className="w-full">
                    {loading ? "Verifying…" : "Verify code"}
                </Button>

                <button
                    type="button"
                    onClick={() => {
                        setStep("signup");
                        setOtp("");
                        setError(null);
                    }}
                    className="text-center text-[var(--text-xs)] uppercase tracking-[0.16em] font-[family-name:var(--font-pxcap)] text-[var(--ink-500)] hover:text-[var(--vellum-050)] transition-colors"
                >
                    Wrong email? Go back.
                </button>
            </form>
        );
    }

    return (
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <Field
                label="Username"
                type="text"
                value={username}
                onChange={setUsername}
                placeholder="your username"
                autoComplete="username"
                skin="chamber"
            />
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
                autoComplete="new-password"
                skin="chamber"
            />
            <Hint>
                8+ characters with uppercase, lowercase, digit, and one of @ $ ! % * ? &amp; #.
            </Hint>

            {error && <Hint tone="error">{error}</Hint>}

            <Button type="submit" intent="primary" disabled={loading} className="w-full">
                {loading ? "Initializing…" : "Join the binding"}
            </Button>

            <a
                href="/auth/login"
                className="text-center text-[var(--text-xs)] uppercase tracking-[0.16em] font-[family-name:var(--font-pxcap)] text-[var(--ink-500)] hover:text-[var(--vellum-050)] transition-colors"
            >
                Already bound? Log in.
            </a>
        </form>
    );
}
