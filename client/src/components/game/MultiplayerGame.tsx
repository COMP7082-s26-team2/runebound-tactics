"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameRoom, useGameRoomState } from "@/context/colyseus";
import { Button } from "@/components/ui/Button";
import { clearGameToken } from "@/lib/multiplayer/reconnect";
import { MultiplayerGameCanvas } from "@/components/game/MultiplayerGameCanvas";
import { InGameMenuModal } from "@/components/game/InGameMenuModal";
import { EndGameStatsScreen } from "@/components/game/EndGameStatsScreen";
import type { GameState } from "@runebound-tactics/shared";

interface MultiplayerGameProps {
    expectedRoomId: string;
}

/**
 * Top-level multiplayer game component.
 *
 * Replaces the previous `GameRoomPlaceholder`. Renders the canvas + in-game
 * menu modal once the room has joined and state has arrived. Handles error
 * and loading states inline.
 *
 * HUD chrome (tactician card, action column, end-turn button, etc.) lives
 * inside the canvas via {@link CanvasHUDSystem}. The DOM-side {@link GameHUD}
 * floating panel is retired — this component only handles the menu modal and
 * the end-of-match overlay.
 */
export function MultiplayerGame({ expectedRoomId }: MultiplayerGameProps) {
    const { room, error } = useGameRoom();
    const state = useGameRoomState();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);

    const roomMatches = room?.roomId === expectedRoomId;

    const prevPhaseRef = useRef<string | undefined>(undefined);
    const prevTurnIdRef = useRef<string | undefined>(undefined);
    const prevTurnNumberRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const phase = state?.phase;
        const currentTurnId = state?.currentTurnId;
        const turnNumber = state?.turnNumber;

        if (phase !== prevPhaseRef.current) {
            console.log(`[GameState] phase: ${prevPhaseRef.current ?? "null"} → ${phase}`);
            prevPhaseRef.current = phase;
        }
        if (currentTurnId !== prevTurnIdRef.current) {
            console.log(`[GameState] currentTurnId: ${prevTurnIdRef.current ?? "null"} → ${currentTurnId}`);
            prevTurnIdRef.current = currentTurnId;
        }
        if (turnNumber !== prevTurnNumberRef.current) {
            console.log(`[GameState] turnNumber: ${prevTurnNumberRef.current ?? "null"} → ${turnNumber}`);
            prevTurnNumberRef.current = turnNumber;
        }
    }, [state?.phase, state?.currentTurnId, state?.turnNumber]);

    const leave = useCallback(async () => {
        clearGameToken();
        try {
            await room?.leave(true);
        } catch {
            /* ignore */
        }
        router.push("/multiplayer");
    }, [room, router]);

    const handleHudAction = useCallback(
        (action: "menu" | "end_turn") => {
            if (action === "menu") {
                setMenuOpen(true);
            } else if (action === "end_turn") {
                room?.send("end_turn", {});
            }
        },
        [room],
    );

    if (error && (!room || roomMatches)) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col gap-3 p-4">
                <p className="text-red-400">
                    Couldn&apos;t join game: {error.message}
                </p>
                <Button
                    onClick={() => {
                        clearGameToken();
                        router.push("/multiplayer");
                    }}
                >
                    ◀ Back to Multiplayer
                </Button>
            </div>
        );
    }

    if (!room || !state || !state.players || !roomMatches) {
        return <p className="text-white p-4">Connecting…</p>;
    }

    // `useGameRoomState` returns a deep-readonly snapshot; cast to the
    // schema class for consumer-side typing. Read-only access is safe — we
    // never call schema mutator methods (assign, clone, etc.) on the
    // snapshot.
    const gameState = state as unknown as GameState;

    const winnerId = gameState.phase === "ended" ? gameState.winnerId : "";
    const players = gameState.players as unknown as Record<
        string,
        { sessionId: string; displayName: string }
    >;
    const winnerSlot = winnerId ? players[winnerId] : undefined;
    const winnerName = winnerSlot?.displayName ?? null;

    return (
        <div className="min-h-screen bg-[var(--ink-900)] flex items-center justify-center">
            <div className="relative inline-block">
                <MultiplayerGameCanvas
                    room={room}
                    state={gameState}
                    onHudAction={handleHudAction}
                />
                {gameState.phase === "ended" && (
                    <EndGameStatsScreen
                        winnerId={winnerId}
                        winnerName={winnerName}
                        mySessionId={room.sessionId}
                        turnsPlayed={gameState.turnNumber + 1}
                        onLeave={leave}
                    />
                )}
            </div>
            <InGameMenuModal
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                onLeave={leave}
            />
        </div>
    );
}
