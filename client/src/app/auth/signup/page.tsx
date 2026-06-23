import RegistrationForm from "@/components/auth/registration-form";
import { createServerSideClient } from "@/lib/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Sigil } from "@/components/ui/Sigil";

export default async function SignUpPage() {
    const supabase = await createServerSideClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (session) {
        redirect("/");
    }

    return (
        <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex flex-col items-center justify-center p-6">
            <Panel skin="chamber" className="w-full max-w-md p-8 flex flex-col gap-6">
                <div className="text-center flex flex-col gap-2">
                    <Eyebrow className="text-[var(--ink-500)]">Inscribe a Seal</Eyebrow>
                    <h1 className="text-[var(--text-xl)] font-bold text-[var(--vellum-050)]">
                        Forge your sigil.
                    </h1>
                    <Hint>Claim a name and join the binding.</Hint>
                </div>
                <RegistrationForm />
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
