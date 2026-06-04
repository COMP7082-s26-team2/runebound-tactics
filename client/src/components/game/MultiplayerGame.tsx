"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameRoom, useGameRoomState } from "@/context/colyseus";
import { Button } from "@/components/ui/Button";
import { clearGameToken } from "@/lib/multiplayer/reconnect";
import { MultiplayerGameCanvas } from "@/components/game/MultiplayerGameCanvas";
import { GameHUD } from "@/components/game/GameHUD";
import type { GameState } from "@runebound-tactics/shared";

interface MultiplayerGameProps {
    expectedRoomId: string;
}

/**
 * Top-level multiplayer game component.
 *
 * Replaces the previous `GameRoomPlaceholder`. Renders the canvas + HUD
 * once the room has joined and state has arrived. Handles error and
 * loading states inline.
 */
export function MultiplayerGame({ expectedRoomId }: MultiplayerGameProps) {
    const { room, error } = useGameRoom();
    const state = useGameRoomState();
    const router = useRouter();

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

    async function leave() {
        clearGameToken();
        try {
            await room?.leave(true);
        } catch {
            /* ignore */
        }
        router.push("/multiplayer");
    }

    function endTurn() {
        room?.send("end_turn", {});
    }

    // `useGameRoomState` returns a deep-readonly snapshot; cast to the
    // schema class for consumer-side typing. Read-only access is safe — we
    // never call schema mutator methods (assign, clone, etc.) on the
    // snapshot.
    const gameState = state as unknown as GameState;

 return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="relative flex items-start justify-center pt-8 w-[1350px] h-[950px]">
                
                <div className="border-2 border-slate-800 shadow-2xl rounded-lg overflow-hidden bg-slate-900">
                    <MultiplayerGameCanvas room={room} state={gameState} />
                </div>

                <GameHUD
                    state={gameState}
                    sessionId={room.sessionId}
                    onLeave={leave}
                    onEndTurn={endTurn}
                />
                
            </div>
        </div>
    );
}
