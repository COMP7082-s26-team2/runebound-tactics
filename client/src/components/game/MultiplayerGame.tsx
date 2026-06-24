"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    useGameConnection,
    useGameRoom,
    useGameRoomMessage,
    useGameRoomState,
} from "@/context/colyseus";
import { Button } from "@/components/ui/Button";
import { clearGameToken } from "@/lib/multiplayer/reconnect";
import { useRoomConnect } from "@/lib/multiplayer/reconnect";
import { InGameMenuModal } from "@/components/game/InGameMenuModal";
import { EndGameStatsScreen } from "@/components/game/EndGameStatsScreen";
import { GameTopBar } from "@/components/game/GameTopBar";
import { ReactionStrip } from "@/components/game/ReactionStrip";
import { ReactionCardModal } from "@/components/game/ReactionCardModal";
import { MultiplayerGameCanvas } from "@/components/game/MultiplayerGameCanvas";
import { GameHUD } from "@/components/game/GameHUD";
import { CombatReactionWindow } from "@/components/game/CombatReactionWindow";
import type { GameState } from "@runebound-tactics/shared";

interface MultiplayerGameProps {
    expectedRoomId: string;
}

const REACTION_TIMEOUT_SECONDS = 10;

/**
 * Top-level multiplayer game component.
 *
 * Composes the page chrome as a vertical stack:
 *   GameTopBar  →  MultiplayerGameCanvas  →  ReactionStrip
 *
 * Everything except the 800×800 board is React DOM, using the BCOMP-124
 * design-system primitives. The board canvas hosts the scene only; per-unit
 * overlays (HP bars, hover tooltips, damage numbers) ship in a follow-up
 * slice as scene-coordinate-tracked render systems.
 */
export function MultiplayerGame({ expectedRoomId }: MultiplayerGameProps) {
    const { room, error } = useGameRoom();
    const state = useGameRoomState();
    const router = useRouter();
    const {
        isReconnecting,
        stateSyncVersion,
        leaveGame,
    } = useGameConnection();
    const { clearGameToken } = useRoomConnect();

    const [menuOpen, setMenuOpen] = useState(false);
    const [cardModalOpen, setCardModalOpen] = useState(false);
    const [reactionPhase, setReactionPhase] = useState("");
    const [reactionActivePlayer, setReactionActivePlayer] = useState("");
    const [secondsRemaining, setSecondsRemaining] = useState(REACTION_TIMEOUT_SECONDS);

    useGameRoomMessage<{ phase: string; activePlayer: string }>(
        "reaction_phase",
        ({ phase, activePlayer }) => {
            setReactionPhase(phase === "closed" ? "" : phase);
            setReactionActivePlayer(activePlayer ?? "");
            setSecondsRemaining(REACTION_TIMEOUT_SECONDS);
            if (phase === "closed") setCardModalOpen(false);
        },
    );

    useEffect(() => {
        if (reactionPhase === "") return;
        const id = setInterval(
            () => setSecondsRemaining((s) => Math.max(0, s - 1)),
            1000,
        );
        return () => clearInterval(id);
    }, [reactionPhase]);

    const roomMatches = room?.roomId === expectedRoomId;

    const leave = useCallback(async () => {
        clearGameToken();
        try {
            await room?.leave(true);
        } catch {
            /* ignore */
        }
        router.push("/multiplayer");
    }, [room, router]);

    const endTurn = useCallback(() => {
        room?.send("end_turn", {});
    }, [room]);

    const passReaction = useCallback(() => {
        room?.send("pass_reaction", {});
        setCardModalOpen(false);
    }, [room]);

    if (error && (!room || roomMatches)) {
        return (
            <main className="min-h-screen bg-[var(--ink-900)] flex flex-col items-center justify-center p-6 gap-3">
                <p className="text-[var(--seal-red)]">
                    Couldn&apos;t join game: {error.message}
                </p>
                <Button
                    intent="primary"
                    onClick={() => {
                        clearGameToken();
                        router.push("/multiplayer");
                    }}
                >
                    Back to Multiplayer
                </Button>
            </main>
        );
    }

    if (!room || !state || !state.players || !roomMatches) {
        return (
            <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-500)] flex items-center justify-center">
                Connecting…
            </main>
        );
    }

    async function leave() {
        if (isReconnecting) {
            return;
        }

        try {
            if (room) {
                await leaveGame(room);
            }
        } catch {
            /* ignore */
        }
        router.push("/multiplayer");
    }

    function endTurn() {
        if (isReconnecting) {
            return;
        }

        room?.send("end_turn", {});
    }

    function passReaction() {
        room?.send("pass_reaction", {});
    }

    function playReactionCard() {
        room?.send("play_reaction_card", {});
    }

    // `useGameRoomState` returns a deep-readonly snapshot; cast to the
    // schema class for consumer-side typing. Read-only access is safe — we
    // never call schema mutator methods (assign, clone, etc.) on the
    // snapshot.
    const gameState = state as unknown as GameState;
    const players = gameState.players as unknown as Record<
        string,
        { sessionId: string; displayName: string }
    >;
    const winnerId = gameState.phase === "ended" ? gameState.winnerId : "";
    const winnerName = winnerId ? (players[winnerId]?.displayName ?? null) : null;
    const isActiveReactor = reactionActivePlayer === room.sessionId;
    const reactorName = reactionActivePlayer
        ? (players[reactionActivePlayer]?.displayName ?? null)
        : null;

    return (
        <main className="h-dvh bg-[var(--ink-900)] text-[var(--ink-300)] flex flex-col overflow-hidden">
            <header className="shrink-0 w-full">
                <GameTopBar
                    state={gameState}
                    sessionId={room.sessionId}
                    reactionPhase={reactionPhase}
                    deckCount={0}
                    discardCount={0}
                    actionsRemaining={null}
                    onMenu={() => setMenuOpen(true)}
                    onEndTurn={endTurn}
                />
            </header>

            <div className="flex-1 min-h-0 flex items-center justify-center p-3">
                <div className="flex flex-col gap-2 h-full max-h-full items-center">
                    <div className="relative flex-1 min-h-0 aspect-square">
                        <MultiplayerGameCanvas room={room} state={gameState} />
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

                    <div className="w-full max-w-[800px] shrink-0">
                        <ReactionStrip
                            phase={reactionPhase}
                            isActiveReactor={isActiveReactor}
                            waitingForName={reactorName}
                            secondsRemaining={secondsRemaining}
                            onPass={passReaction}
                            onOpenCards={() => setCardModalOpen(true)}
                        />
                    </div>
                </div>
            </div>

            <InGameMenuModal
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                onLeave={leave}
            />
            <ReactionCardModal
                isOpen={cardModalOpen}
                onClose={() => setCardModalOpen(false)}
                phase={reactionPhase}
                secondsRemaining={secondsRemaining}
                deckCount={0}
                discardCount={0}
                onPass={passReaction}
            />
        </main>
    );
}
