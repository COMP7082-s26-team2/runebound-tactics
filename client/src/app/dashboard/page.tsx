"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { refreshAuthSessionRecord, signOut } from "@/lib/auth/actions";

export default function DashboardPage() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [username, setUsername] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function verifySession() {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const expiresAt = session?.expires_at;
            const isExpired = expiresAt
                ? Date.now() / 1000 > expiresAt
                : false;

            if (!session || isExpired) {
                if (isExpired) {
                    await supabase.auth.signOut();
                }
                router.replace("/auth/login");
                return;
            }

            // Refresh the DB-backed session record from a server action after
            // Supabase confirms this browser still has a valid session.
            // The client never sends or stores the derived session identifier.
            const refreshedSession = await refreshAuthSessionRecord();
            if ("error" in refreshedSession) {
                // If the server cannot persist/read the DB-backed session, do
                // not let the Supabase browser cookie alone keep the user in.
                await supabase.auth.signOut();
                router.replace("/auth/login");
                return;
            }

            if (!mounted) return;

            setUsername(
                session.user.user_metadata?.username ||
                    session.user.email ||
                    "Player",
            );
            setLoading(false);
        }

        verifySession();

        return () => {
            mounted = false;
        };
    }, [router, supabase]);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-[#111111] border border-[#222222] p-8 shadow-2xl text-center space-y-6">
                <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full border-2 border-[#66ff66] flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <svg
                            className="w-6 h-6 text-[#66ff66]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <span className="text-[10px] text-[#66ff66] uppercase tracking-[0.2em] font-bold">
                        Vector Established
                    </span>
                    <h1 className="text-2xl font-bold tracking-tighter uppercase">
                        Sign-In Success
                    </h1>
                    <p className="text-[#666666] text-xs">
                        Welcome back to Runebound Tactics,{" "}
                        <strong className="text-white">{username}</strong>.
                    </p>
                </div>

                <div className="py-6 border-y border-[#222222] space-y-4">
                    <Link
                        href="/"
                        className="block bg-white text-black py-3 font-bold uppercase tracking-widest text-xs hover:bg-[#dddddd] transition-colors"
                    >
                        ENTER MAIN MENU
                    </Link>
                </div>

                {/* Submit through the server action so logout can mark the DB
                session inactive before Supabase clears the auth cookies. */}
                <form action={signOut}>
                    <button
                        type="submit"
                        className="text-[9px] uppercase tracking-[0.2em] text-[#555555] hover:text-[#ff6666] transition-colors font-bold"
                    >
                        Disconnect Session
                    </button>
                </form>
            </div>
        </div>
    );
}
