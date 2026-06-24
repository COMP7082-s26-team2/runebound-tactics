"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CardHand, type CardData } from "@/components/ui/CardHand";
import { CountdownBar } from "@/components/game/CountdownBar";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Panel } from "@/components/ui/Panel";

// TODO: wire reaction-rail-exit on unmount (deferred)

const REACTION_TIMEOUT_SECONDS = 10;

// Single source of truth for the symmetric slots flanking the centered
// eyebrow+bar — keeps the bar visually fixed as the side-slot content varies.
const MIN_SLOT_W = "min-w-[200px]";
// Caps the horizontal CountdownBar slice so it doesn't stretch in wide chambers.
const MAX_BAR_W = "max-w-[400px]";

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
    cards: CardData[];
    playerGold: number;
    onPass: () => void;
    onPlayCard: (cardName: string) => void;
}

export function ReactionStrip({
    phase,
    isActiveReactor,
    waitingForName,
    secondsRemaining,
    cards,
    playerGold,
    onPass,
    onPlayCard,
}: ReactionStripProps) {
    const passRef = useRef<HTMLButtonElement>(null);

    // Quickplay: one card per reaction window. Once the player commits, the
    // strip locks until the server moves the phase. Reset on every phase
    // transition (including phase → "") so the next reaction starts fresh.
    // Deferred via setTimeout so the setState fires from a timer callback
    // rather than synchronously inside the effect — matches the codebase
    // pattern from T14 (BCOMP-124).
    const [hasPlayed, setHasPlayed] = useState(false);
    useEffect(() => {
        const id = setTimeout(() => setHasPlayed(false), 0);
        return () => clearTimeout(id);
    }, [phase]);

    const handlePlayCard = (cardName: string) => {
        if (hasPlayed) return;
        setHasPlayed(true);
        onPlayCard(cardName);
    };

    const passVisible =
        isActiveReactor && phase !== "" && phase !== "resolve";
    const showInlineRail = passVisible && cards.length > 0 && !hasPlayed;

    // Include showInlineRail in deps so the effect re-fires when the
    // rail branch mounts/unmounts (cards arriving, card played, etc.) and the
    // Pass button is wired to a new DOM node.
    useEffect(() => {
        if (passVisible) {
            passRef.current?.focus();
        }
    }, [isActiveReactor, phase, passVisible, showInlineRail]);

    if (phase === "") {
        return null;
    }

    const label = PHASE_LABELS[phase] ?? phase;
    const urgent = passVisible && secondsRemaining <= 3;

    if (showInlineRail) {
        // Three stacked rows, all horizontally centered:
        //   Row 1: card row (select any card to play it).
        //   Row 2: Pass button (small, under the cards).
        //   Row 3: countdown timer spanning the full width.
        return (
            <div role="region" aria-label="Combat reaction window">
                <Panel
                    skin="chamber"
                    className="w-full px-4 py-3 flex flex-col items-center gap-3 rounded-t-[8px] overflow-hidden"
                >
                    <CardHand
                        cards={cards}
                        playerGold={playerGold}
                        onPlay={handlePlayCard}
                        staggerEnterMs={40}
                    />
                    <Button
                        ref={passRef}
                        intent="secondary"
                        size="sm"
                        onClick={onPass}
                        className={
                            urgent ? "!border-[var(--seal-warning)]" : ""
                        }
                    >
                        Pass
                    </Button>
                    <div className="w-full flex justify-center">
                        <CountdownBar
                            secondsRemaining={secondsRemaining}
                            secondsTotal={REACTION_TIMEOUT_SECONDS}
                        />
                    </div>
                </Panel>
            </div>
        );
    }

    return (
        <div role="region" aria-label="Combat reaction window">
            <Panel
                skin="chamber"
                className="w-full h-[70px] px-4 flex items-center gap-4 rounded-t-[8px] overflow-hidden"
            >
                {/* Left slot — fixed min-width keeps the center-stable
                    eyebrow+bar from drifting as the left-slot content swaps
                    between Hint, Pass, and spacer across sub-cases. */}
                {!isActiveReactor ? (
                    <Hint className={MIN_SLOT_W}>
                        Waiting for{" "}
                        <span className="text-[var(--vellum-050)] font-bold">
                            {waitingForName ?? "—"}
                        </span>
                        …
                    </Hint>
                ) : passVisible ? (
                    <div className={MIN_SLOT_W}>
                        <Button
                            ref={passRef}
                            intent="secondary"
                            size="md"
                            onClick={onPass}
                            className={
                                urgent
                                    ? "!border-[var(--seal-warning)]"
                                    : ""
                            }
                        >
                            Pass
                        </Button>
                    </div>
                ) : (
                    <div className={MIN_SLOT_W} />
                )}

                {/* Center — horizontal eyebrow+bar, same layout direction as
                    the active+cards row so the strip doesn't morph. */}
                <div
                    className={`flex-1 flex items-baseline gap-3 ${MAX_BAR_W} mx-auto`}
                >
                    <Eyebrow className="text-[var(--brass-500)]">
                        {label}
                    </Eyebrow>
                    <div className="flex-1">
                        <CountdownBar
                            secondsRemaining={secondsRemaining}
                            secondsTotal={REACTION_TIMEOUT_SECONDS}
                        />
                    </div>
                </div>

                {/* Right slot — mirrors the left-slot fixed min-width so the
                    center stays anchored under all sub-cases. */}
                {isActiveReactor && passVisible ? (
                    <Hint className={`${MIN_SLOT_W} text-right`}>
                        No cards. Pass to let it resolve.
                    </Hint>
                ) : (
                    <div className={MIN_SLOT_W} />
                )}
            </Panel>
        </div>
    );
}
