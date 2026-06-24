"use client";

import { Button } from "@/components/ui/Button";
import { CountdownBar } from "@/components/game/CountdownBar";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Numeric } from "@/components/ui/Numeric";
import { Panel } from "@/components/ui/Panel";
import { Sigil } from "@/components/ui/Sigil";

const REACTION_TIMEOUT_SECONDS = 10;

const PHASE_LABELS: Record<string, string> = {
    "defender": "Defender's Reaction",
    "defender-ally": "Defender Ally Window",
    "attacker-ally": "Attacker Ally Window",
    "resolve": "Resolving…",
};

interface ReactionStripProps {
    phase: string;
    isActiveReactor: boolean;
    waitingForName?: string | null;
    secondsRemaining: number;
    onPass: () => void;
    onOpenCards: () => void;
}

export function ReactionStrip({
    phase,
    isActiveReactor,
    waitingForName,
    secondsRemaining,
    onPass,
    onOpenCards,
}: ReactionStripProps) {
    if (phase === "") {
        return (
            <Panel
                skin="chamber"
                className="w-full h-[70px] flex items-center justify-center"
            >
                <span className="opacity-30">
                    <Sigil faction="castle" size={28} state="idle" />
                </span>
            </Panel>
        );
    }

    const label = PHASE_LABELS[phase] ?? phase;

    return (
        <Panel
            skin="chamber"
            className="w-full h-[70px] px-4 flex items-center gap-4"
        >
            {isActiveReactor ? (
                <Button intent="secondary" size="md" onClick={onPass}>
                    Pass
                </Button>
            ) : (
                <Hint className="min-w-[200px]">
                    Waiting for{" "}
                    <span className="text-[var(--vellum-050)] font-bold">
                        {waitingForName ?? "—"}
                    </span>
                    …
                </Hint>
            )}

            <div className="flex-1 flex flex-col items-center gap-1">
                <CountdownBar
                    secondsRemaining={secondsRemaining}
                    secondsTotal={REACTION_TIMEOUT_SECONDS}
                />
                <div className="flex items-baseline gap-2">
                    <Eyebrow className="text-[var(--brass-500)]">{label}</Eyebrow>
                    <Numeric
                        size="md"
                        tone={secondsRemaining <= 3 ? "brass" : "default"}
                    >
                        {secondsRemaining}s
                    </Numeric>
                </div>
            </div>

            {isActiveReactor && (
                <Button intent="primary" size="lg" onClick={onOpenCards}>
                    Open Cards
                </Button>
            )}
        </Panel>
    );
}
