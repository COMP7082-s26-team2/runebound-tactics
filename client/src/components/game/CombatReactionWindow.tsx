"use client";

import { useEffect, useState } from "react";
import { useGameRoomMessage, useGameRoomState } from "@/context/colyseus";
import { Button } from "@/components/ui/Button";
import { ReactionCardModal } from "@/components/game/ReactionCardModal";
import type { GameState } from "@runebound-tactics/shared";

interface CombatReactionWindowProps {
    sessionId: string;
    onPass: () => void;
    onPlay: (cardName: string) => void;
}

const PHASE_LABELS: Record<string, string> = {
    "defender":      "Defender's Reaction",
    "defender-ally": "Defender Ally Window",
    "attacker-ally": "Attacker Ally Window",
    "resolve":       "Resolving…",
};

const REACTION_TIMEOUT_SECONDS = 10;

export function CombatReactionWindow({
    sessionId,
    onPass,
    onPlay,
}: CombatReactionWindowProps) {
    const rawState = useGameRoomState();
    const state = rawState as unknown as GameState;

    const [activePlayer, setActivePlayer] = useState<string>("");
    const [secondsLeft, setSecondsLeft] = useState(REACTION_TIMEOUT_SECONDS);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [prevReactionPhase, setPrevReactionPhase] = useState<string>("");

    const reactionPhase: string = state?.reactionPhase ?? "";

    // Reset countdown during render when the sub-phase changes (React-recommended
    // pattern for derived state reset — avoids setState-in-effect lint error).
    if (prevReactionPhase !== reactionPhase) {
        setPrevReactionPhase(reactionPhase);
        setSecondsLeft(REACTION_TIMEOUT_SECONDS);
    }

    // Track which player is active in the current sub-phase.
    useGameRoomMessage<{ phase: string; activePlayer: string }>(
        "reaction_phase",
        ({ phase, activePlayer: ap }) => {
            setActivePlayer(phase === "closed" || phase === "" ? "" : ap);
        },
    );

    const isActivePlayer = activePlayer === sessionId;

    // Tick countdown only for the active player while the window is open.
    useEffect(() => {
        if (reactionPhase === "" || !isActivePlayer) return;
        const id = setInterval(
            () => setSecondsLeft((s) => Math.max(0, s - 1)),
            1000,
        );
        return () => clearInterval(id);
    }, [reactionPhase, isActivePlayer]);

    // Derive reaction cards and gold directly from the live state snapshot.
    const playerSlots = state?.players as unknown as Record<string, {
        gold: number;
        deck: { cards: Array<{ name: string; gold_cost: number; is_reaction: boolean }> };
    }> | undefined;
    const mySlot = playerSlots?.[sessionId];
    const reactionCards = Array.from(mySlot?.deck?.cards ?? []).filter((c) => c.is_reaction);
    const playerGold = mySlot?.gold ?? 0;

    if (reactionPhase === "" && activePlayer === "") return null;

    const phaseLabel = PHASE_LABELS[reactionPhase] ?? reactionPhase;
    const players = state?.players as unknown as Record<
        string,
        { displayName: string }
    > | undefined;
    const activePlayerName = players?.[activePlayer]?.displayName ?? activePlayer;

    return (
        <>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 bg-black/70 text-white font-mono text-sm p-4 rounded min-w-56">
                <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold">{phaseLabel}</span>
                    {isActivePlayer && (
                        <span className="text-yellow-300">{secondsLeft}s</span>
                    )}
                </div>
                {isActivePlayer ? (
                    <div className="flex gap-2 mt-1">
                        <Button type="secondary" onClick={() => setIsCardModalOpen(true)}>
                            Play
                        </Button>
                        <Button onClick={onPass}>Pass</Button>
                    </div>
                ) : (
                    <span className="text-gray-400">
                        Waiting for {activePlayerName}…
                    </span>
                )}
            </div>
            <ReactionCardModal
                isOpen={isCardModalOpen}
                onClose={() => setIsCardModalOpen(false)}
                phase={state.reactionPhase}
                onPass={onPass}
                reactionCards={reactionCards}
                playerGold={playerGold}
                onPlayCard={(cardName) => {
                    onPlay(cardName);
                    setIsCardModalOpen(false);
                }}
            />
        </>
    );
}
