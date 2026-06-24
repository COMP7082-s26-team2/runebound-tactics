import LoginForm from "@/components/auth/login-form";
import { refreshPersistedAuthSession } from "@/lib/auth/session-persistence";
import { createServerSideClient } from "@/lib/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Sigil } from "@/components/ui/Sigil";

export default async function LoginPage() {
    const supabase = await createServerSideClient();

    // getUser() contacts the Supabase Auth server for a cryptographically
    // verified user identity — required for server-side auth guards (BCOMP-202).
    const { data: { user } } = await supabase.auth.getUser();
    console.log("[BCOMP-202] LoginPage getUser:", { userId: user?.id ?? null });

    if (user) {
        // getSession() here is for the session token passed to
        // refreshPersistedAuthSession — not for auth verification (handled above).
        const { data: { session } } = await supabase.auth.getSession();
        const refreshedSession = await refreshPersistedAuthSession(session);

        // Existing Supabase cookies should only bypass login when the matching
        // server-side session row can also be refreshed.
        if (!refreshedSession.success) {
            await supabase.auth.signOut();
        } else {
            redirect("/");
        }
    }

    return (
        <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex flex-col items-center justify-center p-6">
            <Panel skin="chamber" className="w-full max-w-md p-8 flex flex-col gap-6">
                <div className="text-center flex flex-col gap-2">
                    <Eyebrow className="text-[var(--ink-500)]">Runebinders&apos; Hall</Eyebrow>
                    <h1 className="text-[var(--text-xl)] font-bold text-[var(--vellum-050)]">
                        Bind your seal.
                    </h1>
                    <Hint>Enter the realm of Runebound Tactics.</Hint>
                </div>
                <LoginForm />
            </Panel>

            <div className="mt-6 flex items-center gap-3 text-[var(--ink-500)]">
                <Sigil faction="castle" size={12} />
                <Link
                    href="/"
                    className="text-[var(--text-xs)] uppercase tracking-[0.16em] font-[family-name:var(--font-pxcap)] hover:text-[var(--vellum-050)] transition-colors"
                >
                    Return to home
                </Link>
                <Sigil faction="necropolis" size={12} />
            </div>
        </main>
    );
}
