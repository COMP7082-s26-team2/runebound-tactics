"use client";

import { useEffect, useState } from "react";
import { useGameRoomMessage } from "@/context/colyseus";
import { Button } from "@/components/ui/Button";
import type { GameState } from "@runebound-tactics/shared";

interface CombatReactionWindowProps {
    state: GameState;
    sessionId: string;
    onPass: () => void;
    onPlay: () => void;
}

const PHASE_LABELS: Record<string, string> = {
    "defender":      "Defender's Reaction",
    "defender-ally": "Defender Ally Window",
    "attacker-ally": "Attacker Ally Window",
    "resolve":       "Resolving…",
};

const REACTION_TIMEOUT_SECONDS = 10;

export function CombatReactionWindow({
    state,
    sessionId,
    onPass,
    onPlay,
}: CombatReactionWindowProps) {
    const [activePlayer, setActivePlayer] = useState<string>("");
    const [secondsLeft, setSecondsLeft] = useState(REACTION_TIMEOUT_SECONDS);

    // Track which player is active in the current sub-phase.
    useGameRoomMessage<{ phase: string; activePlayer: string }>(
        "reaction_phase",
        ({ activePlayer: ap }) => {
            setActivePlayer(ap);
        },
    );

    // Reset countdown when the sub-phase changes.
    useEffect(() => {
        setSecondsLeft(REACTION_TIMEOUT_SECONDS);
    }, [state.reactionPhase]);

    const isActivePlayer = activePlayer === sessionId;

    // Tick countdown only for the active player while the window is open.
    useEffect(() => {
        if (state.reactionPhase === "" || !isActivePlayer) return;
        const id = setInterval(
            () => setSecondsLeft((s) => Math.max(0, s - 1)),
            1000,
        );
        return () => clearInterval(id);
    }, [state.reactionPhase, isActivePlayer]);

    if (state.reactionPhase === "") return null;

    const phaseLabel = PHASE_LABELS[state.reactionPhase] ?? state.reactionPhase;
    const players = state.players as unknown as Record<
        string,
        { displayName: string }
    >;
    const activePlayerName = players[activePlayer]?.displayName ?? activePlayer;

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 bg-black/70 text-white font-mono text-sm p-4 rounded min-w-56">
            <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">{phaseLabel}</span>
                {isActivePlayer && (
                    <span className="text-yellow-300">{secondsLeft}s</span>
                )}
            </div>
            {isActivePlayer ? (
                <div className="flex gap-2 mt-1">
                    <span title="Card system coming soon">
                        <Button intent="secondary" disabled onClick={onPlay}>
                            Play
                        </Button>
                    </span>
                    <Button onClick={onPass}>Pass</Button>
                </div>
            ) : (
                <span className="text-gray-400">
                    Waiting for {activePlayerName}…
                </span>
            )}
        </div>
    );
}
