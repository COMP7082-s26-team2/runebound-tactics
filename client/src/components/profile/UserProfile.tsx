"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Numeric } from "@/components/ui/Numeric";
import { Panel } from "@/components/ui/Panel";

interface UserProfileProps {
    displayName: string;
    email: string;
}

export function UserProfile({ displayName, email }: UserProfileProps) {
    const router = useRouter();
    const monogram = displayName.charAt(0).toUpperCase();

    return (
        <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex items-start justify-center p-6 py-12">
            <Panel skin="chamber" className="w-full max-w-3xl p-8 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[var(--ink-800)] [box-shadow:var(--bevel-chamber)] flex items-center justify-center text-[var(--text-lg)] text-[var(--ink-500)] font-bold">
                        {monogram}
                    </div>
                    <div className="min-w-0 flex flex-col">
                        <Eyebrow className="text-[var(--ink-500)]">Tactician</Eyebrow>
                        <span className="text-[var(--text-xl)] font-bold text-[var(--vellum-050)] truncate">
                            {displayName}
                        </span>
                        {email && <Hint>{email}</Hint>}
                    </div>
                </div>

                <Divider tone="chamber" ornament={<span className="text-[var(--brass-500)]">◆</span>} />

                <section className="flex flex-col gap-3">
                    <Eyebrow className="text-[var(--brass-500)]">Tactician Record</Eyebrow>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <ProfileStat label="Matches Played" value="—" />
                        <ProfileStat label="Win Rate" value="—" />
                        <ProfileStat label="Avg Turn Length" value="—" />
                        <ProfileStat label="Units Bound" value="—" />
                        <ProfileStat label="Damage Dealt" value="—" />
                        <ProfileStat label="Damage Taken" value="—" />
                    </div>
                    <Hint>Stats track from your first match.</Hint>
                </section>

                <Divider tone="chamber" ornament={<span className="text-[var(--brass-500)]">◆</span>} />

                <section className="flex flex-col gap-3">
                    <Eyebrow className="text-[var(--brass-500)]">Honors</Eyebrow>
                    <Panel skin="chamber" className="p-6 text-center">
                        <Hint>No honors earned yet. Bind your first warband.</Hint>
                    </Panel>
                </section>

                <div className="flex justify-between gap-3 pt-2">
                    <Button intent="secondary" size="md" onClick={() => router.push("/")}>
                        Return to Menu
                    </Button>
                    <form action={signOut}>
                        <Button intent="destructive" size="md" type="submit">
                            Sign Out
                        </Button>
                    </form>
                </div>
            </Panel>
        </main>
    );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
    return (
        <Panel skin="chamber" className="p-3 flex flex-col items-center gap-1">
            <Eyebrow className="text-[var(--ink-500)]">{label}</Eyebrow>
            <Numeric size="lg" tone="brass">{value}</Numeric>
        </Panel>
    );
}
