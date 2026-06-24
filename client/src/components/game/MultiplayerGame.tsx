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
import { useRoomConnect } from "@/lib/multiplayer/reconnect";
import { InGameMenuModal } from "@/components/game/InGameMenuModal";
import { EndGameStatsScreen } from "@/components/game/EndGameStatsScreen";
import { GameTopBar } from "@/components/game/GameTopBar";
import { ReactionStrip } from "@/components/game/ReactionStrip";
import { MultiplayerGameCanvas } from "@/components/game/MultiplayerGameCanvas";
import type { CardData } from "@/components/ui/CardHand";
import type { Faction } from "@/components/ui/Card";
import type { GameState } from "@runebound-tactics/shared";

interface MultiplayerGameProps {
    expectedRoomId: string;
}

const REACTION_TIMEOUT_SECONDS = 10;

interface ReactionCardSchema {
    name: string;
    gold_cost: number;
    is_reaction: boolean;
}

interface PlayerCardSlot {
    gold: number;
    faction?: string;
    deck?: { cards: Iterable<ReactionCardSchema> };
}

/**
 * Top-level multiplayer game component.
 *
 * Vertical chrome stack:
 *   GameTopBar  →  MultiplayerGameCanvas  →  ReactionStrip
 *
 * Everything except the board canvas is React DOM, built on the BCOMP-124
 * design-system primitives. The reaction sub-phase renders the active
 * reactor's hand inline in `ReactionStrip` — no modal context switch.
 */
export function MultiplayerGame({ expectedRoomId }: MultiplayerGameProps) {
    const { room, error } = useGameRoom();
    const state = useGameRoomState();
    const router = useRouter();
    const { isReconnecting, leaveGame } = useGameConnection();
    const { clearGameToken } = useRoomConnect();

    const [menuOpen, setMenuOpen] = useState(false);
    const [reactionPhase, setReactionPhase] = useState("");
    const [reactionActivePlayer, setReactionActivePlayer] = useState("");
    const [secondsRemaining, setSecondsRemaining] = useState(
        REACTION_TIMEOUT_SECONDS,
    );

    useGameRoomMessage<{ phase: string; activePlayer: string }>(
        "reaction_phase",
        ({ phase, activePlayer }) => {
            setReactionPhase(phase === "closed" ? "" : phase);
            setReactionActivePlayer(activePlayer ?? "");
            setSecondsRemaining(REACTION_TIMEOUT_SECONDS);
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
        if (isReconnecting) return;
        clearGameToken();
        try {
            if (room) {
                await leaveGame(room);
            }
        } catch {
            /* ignore */
        }
        router.push("/multiplayer");
    }, [clearGameToken, isReconnecting, leaveGame, room, router]);

    const endTurn = useCallback(() => {
        if (isReconnecting) return;
        room?.send("end_turn", {});
    }, [isReconnecting, room]);

    const passReaction = useCallback(() => {
        room?.send("pass_reaction", {});
    }, [room]);

    const playReactionCard = useCallback(
        (cardName: string) => {
            room?.send("play_reaction_card", { cardName });
        },
        [room],
    );

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

    // `useGameRoomState` returns a deep-readonly snapshot; cast to the schema
    // class for consumer-side typing. We never mutate.
    const gameState = state as unknown as GameState;

    const playersByName = gameState.players as unknown as Record<
        string,
        { sessionId: string; displayName: string }
    >;
    const winnerId = gameState.phase === "ended" ? gameState.winnerId : "";
    const winnerName = winnerId
        ? (playersByName[winnerId]?.displayName ?? null)
        : null;
    const isActiveReactor = reactionActivePlayer === room.sessionId;
    const reactorName = reactionActivePlayer
        ? (playersByName[reactionActivePlayer]?.displayName ?? null)
        : null;

    // Derive the local player's gold + reaction cards from the deep-readonly
    // state snapshot. `useGameRoomState` flattens MapSchema → plain Record and
    // ArraySchema → plain array, so we use bracket access (NOT `.get(...)`).
    const playersBySession = gameState.players as unknown as Record<
        string,
        PlayerCardSlot | undefined
    >;
    const mySlot = playersBySession[room.sessionId];
    const myGold = mySlot?.gold ?? 0;
    const rawFaction = mySlot?.faction;
    const myFaction: Faction | null =
        rawFaction === "castle" || rawFaction === "necropolis"
            ? rawFaction
            : null;
    // Show all reaction cards in the hand. Quickplay's "one play per window"
    // rule is enforced client-side inside `ReactionStrip` via a `hasPlayed`
    // lock that fires on the first card click and resets on phase transition.
    const myReactionCards: CardData[] = mySlot?.deck?.cards
        ? Array.from(mySlot.deck.cards)
              .filter((c) => c.is_reaction)
              .map((c) => ({
                  name: c.name,
                  kind: c.name.toLowerCase().replace(/\s+/g, "-"),
                  cost: c.gold_cost,
                  description: "",
                  factionInk: myFaction,
              }))
        : [];

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
                <div className="relative h-full">
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
            </div>

            <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-full max-w-[800px] px-3 z-40 pointer-events-none">
                <div className="pointer-events-auto">
                    <ReactionStrip
                        phase={reactionPhase}
                        isActiveReactor={isActiveReactor}
                        waitingForName={reactorName}
                        secondsRemaining={secondsRemaining}
                        cards={myReactionCards}
                        playerGold={myGold}
                        onPass={passReaction}
                        onPlayCard={playReactionCard}
                    />
                </div>
            </div>

            <InGameMenuModal
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                onLeave={leave}
            />
        </main>
    );
}
