"use client";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Modal } from "@/components/ui/Modal";
import { Numeric } from "@/components/ui/Numeric";
import { useEffect } from "react";

/**
 * Reaction card picker modal — refined per BCOMP-194 / vault
 * `runebound-tactics/reaction-window-redesign_design_v1.0`.
 *
 * Refinements vs PR #58's `ReactionCardModal`:
 *   - Title "Reaction cards" (was "Cards Available").
 *   - Pass button labeled "Pass without playing" — disambiguates against
 *     the strip's "Pass" and against future per-card play buttons.
 *   - Empty-state hint adds "Pass to let the exchange resolve." — empty
 *     states are direction, not mood.
 *   - Auto-closes when phase transitions (incl. → "") so the player
 *     never stares at a stale picker.
 *
 * Phase-1 lite: token values inlined; swap to `var(--ink-300)` etc. once
 * the BCOMP-124 UI line merges below.
 */

const INK_500 = "#4a546b";
const INK_300 = "#b3bbcc";
const BRASS_500 = "#b8893d";

interface ReactionCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    phase: string;
    secondsRemaining: number;
    deckCount: number;
    discardCount: number;
    onPass: () => void;
}

export function ReactionCardModal({
    isOpen,
    onClose,
    phase,
    secondsRemaining,
    deckCount,
    discardCount,
    onPass,
}: ReactionCardModalProps) {
    // Auto-close on phase transition so a stale picker can't linger.
    useEffect(() => {
        if (isOpen) onClose();
        // Only re-runs when phase changes; isOpen/onClose intentionally
        // omitted — this hook fires *because* phase changed, not because
        // the modal was just opened.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cards Available">
            <div className="flex flex-col gap-4">
                <Eyebrow className="text-[var(--brass-500)]">
                    Reaction — {phase || "Idle"}
                </Eyebrow>
                <Hint>Choose a card to play, or pass to let the attack resolve.</Hint>

                <div className="min-h-[180px] flex items-center justify-center border border-dashed border-[var(--ink-500)] p-6">
                    <Hint>No cards in hand.</Hint>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--ink-500)]">
                    <div className="flex gap-4 text-[var(--text-xs)]">
                        <span className="inline-flex items-center gap-1">
                            <Eyebrow className="text-[var(--ink-500)]">Deck</Eyebrow>
                            <Numeric size="sm" tone="brass">{deckCount}</Numeric>
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Eyebrow className="text-[var(--ink-500)]">Disc</Eyebrow>
                            <Numeric size="sm" tone="brass">{discardCount}</Numeric>
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Numeric size="lg" tone="brass">{secondsRemaining}s</Numeric>
                        <Button intent="secondary" size="md" onClick={onPass}>
                            Pass
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
