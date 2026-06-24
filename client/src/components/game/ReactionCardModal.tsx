"use client";

import { useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

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
    onPass: () => void;
}

export function ReactionCardModal({
    isOpen,
    onClose,
    phase,
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
        <Modal isOpen={isOpen} onClose={onClose} title="Reaction cards">
            <div className="flex flex-col gap-4">
                <div
                    className="text-xs font-bold tracking-[0.18em] uppercase"
                    style={{ color: BRASS_500 }}
                >
                    Reaction — {phase || "Idle"}
                </div>

                <p className="text-sm" style={{ color: INK_300 }}>
                    Choose a card to play, or pass to let the exchange resolve.
                </p>

                <div
                    className="min-h-[180px] flex flex-col items-center justify-center gap-2 p-6"
                    style={{ border: `1px dashed ${INK_500}` }}
                >
                    <p className="text-sm" style={{ color: INK_300 }}>
                        No cards in hand.
                    </p>
                    <p className="text-xs" style={{ color: INK_500 }}>
                        Pass to let the exchange resolve.
                    </p>
                </div>

                <div className="flex justify-end pt-2">
                    <Button type="secondary" onClick={onPass}>
                        Pass without playing
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
