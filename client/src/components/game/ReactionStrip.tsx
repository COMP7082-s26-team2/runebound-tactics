"use client";

import { useEffect, useRef, useState } from "react";
import { useGameRoomMessage } from "@/context/colyseus";
import { Button } from "@/components/ui/Button";
import type { GameState } from "@runebound-tactics/shared";
import { CountdownBar } from "@/components/game/CountdownBar";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Hint } from "@/components/ui/Hint";
import { Numeric } from "@/components/ui/Numeric";
import { Panel } from "@/components/ui/Panel";
import { Sigil } from "@/components/ui/Sigil";

const PHASE_LABELS: Record<string, string> = {
    "defender": "Defender's Reaction",
    "defender-ally": "Defender Ally Window",
    "attacker-ally": "Attacker Ally Window",
    "resolve": "Resolving…",
};
    
    
/**
 * Reaction window — refined pass/play strip per BCOMP-194 / vault
 * `runebound-tactics/reaction-window-redesign_design_v1.0`.
 *
 * Phase-1 lite: visual + behavior land on PR #54 base (PR #53 +
 * animation fix) without depending on PR #58's Panel / Sigil / Eyebrow /
 * CountdownBar / Numeric / Hint primitives. Tokens inlined as hex; the
 * file is structured so each inline swaps to a primitive import once
 * the BCOMP-124 UI line merges below.
 *
 * Differences from PR #53's `CombatReactionWindow`:
 *   - Returns `null` when reactionPhase === "" (no ghost surface).
 *   - Renames "Play" → "Play reaction"; opens cards modal via onOpenCards.
 *   - Drops the duplicate `{seconds}s` numeric; the bar IS the timer.
 *   - Non-active layout has no Pass button — strip is decisively passive.
 *   - Per-phase eyebrow + Hint copy with active vs non-active variants.
 *   - Pass border shifts brass → seal-warning at secondsRemaining ≤ 3.
 *   - Player's faction glyph prefix on the active-reactor layout.
 *   - Pass autofocused; Enter = pass.
 *   - role="region", aria-label="Combat reaction window".
 */

const REACTION_TIMEOUT_SECONDS = 10;

const INK_900 = "#0c1018";
const INK_500 = "#4a546b";
const INK_300 = "#b3bbcc";
const VELLUM_050 = "#f3eddc";
const VELLUM_400 = "#c8bd9c";
const BRASS_500 = "#b8893d";
const BRASS_300 = "#d6b072";
const SEAL_RED = "#9b2a2a";
const SEAL_WARNING = "#c2742a";

interface PhaseCopy {
    eyebrow: string;
    activeHint: string;
    nonActiveHint: string;
}

const PHASE_COPY: Record<string, PhaseCopy> = {
    "defender": {
        eyebrow: "DEFENDER",
        activeHint: "Strike incoming. React or pass.",
        nonActiveHint: "Strike incoming. Their move.",
    },
    "defender-ally": {
        eyebrow: "DEFENDER ALLY",
        activeHint: "Your ally is under attack. React or pass.",
        nonActiveHint: "Your ally is under attack. Their move.",
    },
    "attacker-ally": {
        eyebrow: "ATTACKER ALLY",
        activeHint: "Your ally is striking. React or pass.",
        nonActiveHint: "Your ally is striking. Their move.",
    },
    "resolve": {
        eyebrow: "RESOLVE",
        activeHint: "No reactions. The exchange resolves.",
        nonActiveHint: "The exchange resolves.",
    },
};

interface ReactionStripProps {
    state: GameState;
    sessionId: string;
    phase: string;
    isActiveReactor: boolean;
    waitingForName?: string | null;
    secondsRemaining: number;
    onPass: () => void;
    onOpenCards: () => void;
}

export function ReactionStrip({
    phase,
    isActiveReactor,
    waitingForName,
    secondsRemaining,
    onPass,
    onOpenCards,
    state,
    sessionId,   
}: ReactionStripProps) {
    if (phase === "") {
        return (
            <Panel
                skin="chamber"
                className="w-full h-[70px] flex items-center justify-center"
            >
                <span className="opacity-30">
                    <Sigil faction="castle" size={28} state="idle" />
                </span>
            </Panel>
        );
    }

    const label = PHASE_LABELS[phase] ?? phase;

    return (
        <Panel
            skin="chamber"
            className="w-full h-[70px] px-4 flex items-center gap-4"
        >
            {isActiveReactor ? (
                <Button intent="secondary" size="md" onClick={onPass}>
                    Pass
                </Button>
            ) : (
                <Hint className="min-w-[200px]">
                    Waiting for{" "}
                    <span className="text-[var(--vellum-050)] font-bold">
                        {waitingForName ?? "—"}
                    </span>
                    …
                </Hint>
            )}

            <div className="flex-1 flex flex-col items-center gap-1">
                <CountdownBar
                    secondsRemaining={secondsRemaining}
                    secondsTotal={REACTION_TIMEOUT_SECONDS}
                />
                <div className="flex items-baseline gap-2">
                    <Eyebrow className="text-[var(--brass-500)]">{label}</Eyebrow>
                    <Numeric
                        size="md"
                        tone={secondsRemaining <= 3 ? "brass" : "default"}
                    >
                        {secondsRemaining}s
                    </Numeric>
                </div>
            </div>

            {isActiveReactor && (
                <Button intent="primary" size="lg" onClick={onOpenCards}>
                    Open Cards
                </Button>
            )}
        </Panel>
      
      
    const [activePlayer, setActivePlayer] = useState<string>("");
    const [secondsRemaining, setSecondsRemaining] = useState(REACTION_TIMEOUT_SECONDS);
    const passButtonRef = useRef<HTMLDivElement>(null);

    useGameRoomMessage<{ phase: string; activePlayer: string }>(
        "reaction_phase",
        ({ activePlayer: ap }) => setActivePlayer(ap),
    );

    useEffect(() => {
        setSecondsRemaining(REACTION_TIMEOUT_SECONDS);
    }, [state.reactionPhase]);

    const isActiveReactor = activePlayer === sessionId;

    useEffect(() => {
        if (state.reactionPhase === "" || !isActiveReactor) return;
        const id = setInterval(
            () => setSecondsRemaining((s) => Math.max(0, s - 1)),
            1000,
        );
        return () => clearInterval(id);
    }, [state.reactionPhase, isActiveReactor]);

    useEffect(() => {
        if (isActiveReactor && state.reactionPhase !== "") {
            passButtonRef.current?.querySelector("button")?.focus();
        }
    }, [isActiveReactor, state.reactionPhase]);

    if (state.reactionPhase === "") return null;

    const copy = PHASE_COPY[state.reactionPhase] ?? {
        eyebrow: state.reactionPhase.toUpperCase(),
        activeHint: "",
        nonActiveHint: "",
    };

    const players = state.players as unknown as Record<
        string,
        { displayName: string; faction?: string }
    >;
    const activeName = players[activePlayer]?.displayName ?? activePlayer;
    const myFaction = players[sessionId]?.faction ?? "castle";
    const factionGlyph = myFaction === "necropolis" ? "☠" : "♛";

    const urgent = isActiveReactor && secondsRemaining <= 3;
    const passBorder = urgent ? SEAL_WARNING : BRASS_500;

    const pct = Math.max(
        0,
        Math.min(1, secondsRemaining / REACTION_TIMEOUT_SECONDS),
    );
    const barColor = pct > 0.6 ? BRASS_300 : pct > 0.3 ? SEAL_WARNING : SEAL_RED;

    return (
        <div
            className="w-full px-4 py-3 flex items-center gap-4"
            style={{
                background: INK_900,
                border: `2px solid ${VELLUM_400}`,
                boxShadow: `inset 1px 1px 0 ${INK_500}, inset -1px -1px 0 ${INK_900}`,
                minHeight: 70,
            }}
            role="region"
            aria-label="Combat reaction window"
        >
            {/* Left column — actions or waiting */}
            {isActiveReactor ? (
                <div
                    ref={passButtonRef}
                    className="flex items-center gap-2"
                    style={{
                        outline: `2px solid ${passBorder}`,
                        outlineOffset: -2,
                    }}
                >
                    <Button type="secondary" onClick={onPass}>
                        Pass
                    </Button>
                </div>
            ) : (
                <div
                    className="min-w-[200px] text-xs italic"
                    style={{ color: INK_300 }}
                >
                    Waiting for{" "}
                    <span
                        className="font-bold not-italic"
                        style={{ color: VELLUM_050 }}
                    >
                        {activeName}
                    </span>
                    …
                </div>
            )}

            {/* Middle — eyebrow + hint + bar */}
            <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-baseline gap-3">
                    {isActiveReactor && (
                        <span
                            className="text-lg"
                            style={{ color: BRASS_300 }}
                            aria-hidden="true"
                        >
                            {factionGlyph}
                        </span>
                    )}
                    <span
                        className="text-xs font-bold tracking-[0.18em] uppercase"
                        style={{ color: BRASS_500 }}
                    >
                        {copy.eyebrow}
                    </span>
                    <span
                        className="text-xs"
                        style={{ color: INK_300 }}
                        aria-live="polite"
                    >
                        {isActiveReactor ? copy.activeHint : copy.nonActiveHint}
                    </span>
                </div>
                <div
                    className="relative h-3 w-full"
                    style={{
                        background: INK_900,
                        boxShadow: `inset 1px 1px 0 ${INK_500}, inset -1px -1px 0 ${INK_900}`,
                    }}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={REACTION_TIMEOUT_SECONDS}
                    aria-valuenow={secondsRemaining}
                    aria-label="Reaction countdown"
                >
                    <div
                        className="h-full motion-safe:transition-[width] motion-safe:duration-300"
                        style={{ width: `${pct * 100}%`, background: barColor }}
                    />
                </div>
            </div>

            {/* Right column — play reaction */}
            {isActiveReactor && (
                <Button type="primary" onClick={onOpenCards}>
                    Play reaction
                </Button>
            )}
        </div>
    );
}
