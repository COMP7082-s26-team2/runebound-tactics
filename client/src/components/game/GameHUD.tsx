"use client";

import { Button } from "@/components/ui/Button";
import type { GameState } from "@runebound-tactics/shared";

interface GameHUDProps {
    state: GameState;
    sessionId: string;
    interactionDisabled: boolean;
    onLeave: () => void;
    onEndTurn: () => void;
}

/**
 * Minimal multiplayer HUD overlay.
 *
 * Shows whose turn it is, an End Turn button (disabled when it's not your
 * turn), and a Leave button. Sits on top of the canvas via absolute
 * positioning. The canvas itself handles all unit selection / movement.
 */
export function GameHUD({
    state,
    sessionId,
    interactionDisabled,
    onLeave,
    onEndTurn,
}: GameHUDProps) {
    const isMyTurn = state.currentTurnId === sessionId && state.phase === "active";
    const players = state.players as unknown as Record<
        string,
        { sessionId: string; displayName: string }
    >;
    const activePlayer = players?.[state.currentTurnId];

    return (
        <div className="absolute top-2 right-2 flex flex-col gap-2 bg-black/60 p-3 rounded">
            <div className="text-white font-mono text-sm">
                <div>Phase: {state.phase}</div>
                <div>
                    Turn:{" "}
                    {isMyTurn
                        ? "Your turn"
                        : `${activePlayer?.displayName ?? "—"}`}
                </div>
                <div>Round: {state.turnNumber + 1}</div>
            </div>
            <div className="flex gap-2">
                <Button
                    onClick={onEndTurn}
                    disabled={!isMyTurn || interactionDisabled}
                >
                    End Turn
                </Button>
                <Button onClick={onLeave} disabled={interactionDisabled}>
                    Leave
                </Button>
            </div>
        </div>
    );
}
