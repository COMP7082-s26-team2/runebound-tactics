"use client";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Modal } from "@/components/ui/Modal";
import { Numeric } from "@/components/ui/Numeric";

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
