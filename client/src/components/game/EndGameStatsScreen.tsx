"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Numeric } from "@/components/ui/Numeric";
import { Panel } from "@/components/ui/Panel";

interface EndGameStatsScreenProps {
    winnerId: string;
    winnerName: string | null;
    mySessionId: string;
    turnsPlayed: number;
    onLeave: () => void;
}

export function EndGameStatsScreen({
    winnerId,
    winnerName,
    mySessionId,
    turnsPlayed,
    onLeave,
}: EndGameStatsScreenProps) {
    const router = useRouter();
    const won = winnerId === mySessionId;

    return (
        <div
            className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--ink-900)]/85 p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Match concluded"
        >
            <Panel skin="chamber" className="w-full max-w-xl p-8 flex flex-col gap-6 [box-shadow:var(--elev-pixel-raised)]">
                <div className="text-center flex flex-col gap-2">
                    <Eyebrow className="text-[var(--brass-500)]">Match Concluded</Eyebrow>
                    <h1
                        className={`text-[5rem] md:text-[7rem] font-bold leading-[0.9] tracking-tight ${
                            won
                                ? "text-[var(--brass-300)]"
                                : "text-[var(--seal-red)] opacity-80"
                        }`}
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        {won ? "Victory" : "Defeat"}
                    </h1>
                    {winnerName && !won && (
                        <Hint>
                            <span className="text-[var(--vellum-050)] font-bold">{winnerName}</span> claims the field.
                        </Hint>
                    )}
                    {won && <Hint>The field is yours.</Hint>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Panel skin="chamber" className="p-4 flex flex-col items-center gap-1">
                        <Eyebrow className="text-[var(--ink-500)]">Turns Played</Eyebrow>
                        <Numeric size="xl" tone="brass">{turnsPlayed}</Numeric>
                    </Panel>
                    <Panel skin="chamber" className="p-4 flex flex-col items-center gap-1">
                        <Eyebrow className="text-[var(--ink-500)]">Stats</Eyebrow>
                        <Hint>Detailed stats coming soon</Hint>
                    </Panel>
                </div>

                <div className="flex gap-3 justify-center">
                    <Button intent="primary" size="lg" disabled>
                        Rematch
                    </Button>
                    <Button intent="secondary" size="lg" onClick={() => {
                        onLeave();
                        router.push("/");
                    }}>
                        Return to Menu
                    </Button>
                </div>
            </Panel>
        </div>
    );
}
