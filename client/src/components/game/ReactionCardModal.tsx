"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Modal } from "@/components/ui/Modal";
import { Numeric } from "@/components/ui/Numeric";

interface ReactionCard {
    name: string;
    gold_cost: number;
}

interface ReactionCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    phase: string;
    reactionCards: ReactionCard[];
    playerGold: number;
    onPass: () => void;
    onPlayCard: (cardName: string) => void;
}

/**
 * Reaction card picker modal — per vault designs:
 *   - `runebound-tactics/ui-design-system_design_v1.5` (BCOMP-124 primitives)
 *   - `runebound-tactics/reaction-window-redesign_design_v1.0` (BCOMP-194)
 *
 * Title "Reaction cards" (action-named, not surface-named).
 * Pass button reads "Pass without playing" — disambiguates from the strip's Pass
 * and from per-card play actions inside the modal.
 * Auto-closes when phase transitions so a stale picker can't linger.
 */
export function ReactionCardModal({
    isOpen,
    onClose,
    phase,
    reactionCards,
    playerGold,
    onPass,
    onPlayCard,
}: ReactionCardModalProps) {
    useEffect(() => {
        if (isOpen) onClose();
        // Intentionally watches only `phase` — fires when the sub-phase
        // changes, not when the modal opens.
    }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reaction cards">
            <div className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-3">
                    <Eyebrow className="text-[var(--brass-500)]">
                        Reaction — {phase || "Idle"}
                    </Eyebrow>
                    <span className="inline-flex items-baseline gap-1 text-[var(--text-2xs)] text-[var(--ink-300)]">
                        Gold
                        <Numeric size="sm" tone="brass">
                            {playerGold}
                        </Numeric>
                    </span>
                </div>

                <Hint>
                    Choose a card to play, or pass to let the exchange resolve.
                </Hint>

                {reactionCards.length === 0 ? (
                    <div className="min-h-[180px] flex flex-col items-center justify-center gap-2 p-6 border border-dashed border-[var(--ink-500)]">
                        <Hint>No cards in hand.</Hint>
                        <Hint>Pass to let the exchange resolve.</Hint>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {reactionCards.map((card) => {
                            const canAfford = playerGold >= card.gold_cost;
                            return (
                                <li key={card.name}>
                                    <button
                                        type="button"
                                        disabled={!canAfford}
                                        onClick={() => onPlayCard(card.name)}
                                        className="w-full flex items-center justify-between px-3 py-2 text-left text-[var(--text-sm)] bg-[var(--ink-700)] text-[var(--vellum-050)] [box-shadow:var(--bevel-chamber)] hover:bg-[var(--ink-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-300)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--ink-700)]"
                                    >
                                        <span>{card.name}</span>
                                        {card.gold_cost > 0 && (
                                            <span className="text-[var(--brass-500)] font-bold">
                                                {card.gold_cost}g
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="flex justify-end pt-2">
                    <Button intent="secondary" onClick={onPass}>
                        Pass without playing
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
