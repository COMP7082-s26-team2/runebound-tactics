"use client";

import type { GameState } from "@runebound-tactics/shared";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Numeric } from "@/components/ui/Numeric";
import { Panel } from "@/components/ui/Panel";
import { Sigil, type Faction } from "@/components/ui/Sigil";
import { Stat } from "@/components/ui/Stat";

const PHASE_LABELS: Record<string, string> = {
    setup: "Setup",
    active: "Action",
    ended: "Ended",
};

const PHASE_COLORS: Record<string, string> = {
    setup: "var(--ink-500)",
    active: "var(--vellum-050)",
    ended: "var(--seal-red)",
};

interface GameTopBarProps {
    state: GameState;
    sessionId: string;
    reactionPhase: string;
    deckCount: number;
    discardCount: number;
    actionsRemaining: number | null;
    gold: number;
    onMenu: () => void;
    onEndTurn: () => void;
}

function parseFaction(raw: string | null | undefined): Faction | null {
    if (raw === "castle") return "castle";
    if (raw === "necropolis") return "necropolis";
    return null;
}

export function GameTopBar({
    state,
    sessionId,
    reactionPhase,
    deckCount,
    discardCount,
    actionsRemaining,
    gold,
    onMenu,
    onEndTurn,
}: GameTopBarProps) {
    const players = state.players as unknown as Record<
        string,
        { sessionId: string; displayName: string; faction?: string }
    >;
    const me = players?.[sessionId];
    const displayName = me?.displayName ?? "Tactician";
    const myFaction = parseFaction(me?.faction);

    const active = players?.[state.currentTurnId];
    const isMyTurn = state.currentTurnId === sessionId && state.phase === "active";
    const canEndTurn = isMyTurn && reactionPhase === "";

    const inReaction = reactionPhase !== "";
    const phaseLabel = inReaction
        ? "REACTION"
        : (PHASE_LABELS[state.phase] ?? state.phase).toUpperCase();
    const phaseColor = inReaction
        ? "var(--brass-500)"
        : (PHASE_COLORS[state.phase] ?? "var(--ink-300)");

    return (
        <Panel skin="chamber" className="w-full px-4 py-3 flex items-center gap-4">
            {/* Identity */}
            <div className="flex items-center gap-3 min-w-0">
                <Button intent="secondary" size="sm" onClick={onMenu}>
                    ⚙
                </Button>
                <div className="flex items-center gap-2 min-w-0">
                    {myFaction && (
                        <Sigil faction={myFaction} size={20} state="active" />
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="text-[var(--text-sm)] font-bold text-[var(--vellum-050)] truncate">
                            {displayName}
                        </span>
                        <Eyebrow className="text-[var(--ink-500)]">Diamond I</Eyebrow>
                    </div>
                </div>
            </div>

            {/* Status */}
            <div className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-center gap-6">
                    <Stat
                        label={<Eyebrow className="text-[var(--ink-500)]">Phase</Eyebrow>}
                        value={
                            <span
                                className="font-bold flex items-center gap-1"
                                style={{ color: phaseColor }}
                            >
                                {inReaction && (
                                    <span aria-hidden="true">●</span>
                                )}
                                {phaseLabel}
                            </span>
                        }
                    />
                    <Stat
                        label={<Eyebrow className="text-[var(--ink-500)]">Turn</Eyebrow>}
                        value={
                            <span className="font-bold text-[var(--vellum-050)] truncate max-w-[120px]">
                                {isMyTurn ? "You" : (active?.displayName ?? "—")}
                            </span>
                        }
                    />
                    <Stat
                        label={<Eyebrow className="text-[var(--ink-500)]">Round</Eyebrow>}
                        value={<Numeric size="sm" tone="brass">{state.turnNumber + 1}</Numeric>}
                    />
                </div>
                <div className="flex items-center gap-4 text-[var(--text-xs)]">
                    <Chip glyph="◆" label="Deck" count={deckCount} />
                    <Chip glyph="✦" label="Discard" count={discardCount} />
                    <Chip glyph="⚡" label="AP" count={actionsRemaining} />
                    <Chip glyph="◎" label="Gold" count={gold} />
                </div>
            </div>

            {/* Action */}
            <Button
                intent="primary"
                size="lg"
                onClick={onEndTurn}
                disabled={!canEndTurn}
            >
                End Turn
            </Button>
        </Panel>
    );
}

function Chip({
    glyph,
    label,
    count,
}: {
    glyph: string;
    label: string;
    count: number | null;
}) {
    const dimmed = count === null || count === 0;
    return (
        <span className={`inline-flex items-center gap-1 ${dimmed ? "opacity-40" : ""}`}>
            <span className="text-[var(--brass-500)]" aria-hidden="true">
                {glyph}
            </span>
            <Eyebrow className="text-[var(--ink-500)]">{label}</Eyebrow>
            <Numeric size="sm" tone={dimmed ? "faded" : "brass"}>
                {count ?? "—"}
            </Numeric>
        </span>
    );
}
