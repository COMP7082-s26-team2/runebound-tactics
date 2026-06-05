import LoginForm from "@/components/auth/login-form";
import { refreshPersistedAuthSession } from "@/app/auth/session-persistence";
import { createServerSideClient } from "@/lib/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage() {
    const supabase = await createServerSideClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (session) {
        const refreshedSession = await refreshPersistedAuthSession(session);

        // Existing Supabase cookies should only bypass login when the matching
        // server-side session row can also be refreshed.
        if (!refreshedSession.success) {
            await supabase.auth.signOut();
        } else {
            redirect("/dashboard");
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-[#111111] border border-[#222222] p-8 shadow-2xl">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold tracking-tighter uppercase mb-2">
                        Player Login
                    </h1>
                    <p className="text-[#666666] text-sm">
                        Enter the Runebound Tactics Realm
                    </p>
                </div>

                {/* Login Form */}
                <LoginForm />

                <div className="mb-4"></div>
            </div>

            <Link
                href="/"
                className="mt-8 text-[#444444] hover:text-[#888888] text-xs uppercase tracking-widest transition-colors"
            >
                Return to Home
            </Link>
        </div>
    );
}
