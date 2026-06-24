"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * Multiplayer reconnect overlay — "hold the line" redesign per
 * BCOMP-193 / `runebound-tactics/reconnect-ui-redesign_design_v1.0`.
 *
 * Phase-1 lite: visual structure + countdown work standalone against the
 * current branch base (PR #55 / `feature/BCOMP-168-user-session-merge`).
 * Token values, sigils, and the `Panel` / `CountdownBar` primitives are
 * inlined here. When PR #58 (BCOMP-124 UI) merges into this branch's
 * ancestry, swap inline tokens for `var(--ink-900)` etc. and the inline
 * shapes for `<Panel skin="chamber">` / `<Sigil />` / `<CountdownBar />`.
 *
 * Integration: wires into `MultiplayerGame.tsx` via `isReconnecting` from
 * `useGameConnection()` once PR #51 (BCOMP-191) merges below. Until then
 * this component is exportable for visual review but unmounted at runtime.
 */

interface GameReconnectOverlayProps {
    reconnectWindowSeconds?: number;
    onLeave?: () => void;
}

const DEFAULT_RECONNECT_WINDOW_SECONDS = 60;
const MS_PER_SECOND = 1_000;
const COUNTDOWN_TICK_MS = 250;

const INK_900 = "#0c1018";
const INK_500 = "#4a546b";
const INK_300 = "#b3bbcc";
const VELLUM_050 = "#f3eddc";
const VELLUM_400 = "#c8bd9c";
const BRASS_500 = "#b8893d";
const BRASS_300 = "#d6b072";
const SEAL_RED = "#9b2a2a";
const SEAL_WARNING = "#c2742a";

export function GameReconnectOverlay({
    reconnectWindowSeconds = DEFAULT_RECONNECT_WINDOW_SECONDS,
    onLeave,
}: GameReconnectOverlayProps) {
    const router = useRouter();
    const [secondsRemaining, setSecondsRemaining] = useState(
        reconnectWindowSeconds,
    );

    useEffect(() => {
        const deadline = Date.now() + reconnectWindowSeconds * MS_PER_SECOND;
        const tick = () => {
            const remainingMs = Math.max(0, deadline - Date.now());
            setSecondsRemaining(Math.ceil(remainingMs / MS_PER_SECOND));
        };
        const id = window.setInterval(tick, COUNTDOWN_TICK_MS);
        return () => window.clearInterval(id);
    }, [reconnectWindowSeconds]);

    function handleLeave() {
        if (onLeave) {
            onLeave();
            return;
        }
        router.push("/multiplayer");
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: `${INK_900}cc` }}
            role="alertdialog"
            aria-labelledby="reconnect-title"
            aria-describedby="reconnect-body"
        >
            <div
                className="w-full max-w-md mx-4 px-8 py-7 flex flex-col items-center gap-4"
                style={{
                    background: INK_900,
                    boxShadow: `inset 1px 1px 0 ${INK_500}, inset -1px -1px 0 ${INK_900}, 4px 4px 0 0 rgba(20, 16, 8, 0.55)`,
                    border: `2px solid ${VELLUM_400}`,
                }}
            >
                <HoldTheLineSigils />

                <div
                    className="text-xs font-bold tracking-[0.22em] uppercase"
                    style={{ color: BRASS_500 }}
                >
                    The line holds
                </div>

                <h2
                    id="reconnect-title"
                    className="text-2xl font-bold text-center leading-tight"
                    style={{ color: VELLUM_050, fontFamily: "serif" }}
                >
                    Reconnecting to match
                </h2>

                <p
                    id="reconnect-body"
                    className="text-sm text-center"
                    style={{ color: INK_300 }}
                >
                    {secondsRemaining > 0
                        ? `You will forfeit in ${secondsRemaining} ${secondsRemaining === 1 ? "second" : "seconds"}.`
                        : "Reconnect window closed. Returning to the lobby."}
                </p>

                <CountdownBar
                    secondsRemaining={secondsRemaining}
                    secondsTotal={reconnectWindowSeconds}
                />

                <Button type="danger" onClick={handleLeave}>
                    Leave the field
                </Button>
            </div>
        </div>
    );
}

function HoldTheLineSigils() {
    return (
        <div
            className="flex items-center gap-4 py-2"
            aria-hidden="true"
        >
            <span
                className="text-3xl motion-safe:animate-pulse"
                style={{ color: BRASS_300, textShadow: `0 0 8px ${BRASS_500}` }}
            >
                ♛
            </span>
            <span
                className="block w-12 h-px"
                style={{ background: BRASS_500 }}
            />
            <span
                className="text-3xl"
                style={{ color: INK_500 }}
            >
                ☠
            </span>
        </div>
    );
}

interface CountdownBarProps {
    secondsRemaining: number;
    secondsTotal: number;
}

function CountdownBar({ secondsRemaining, secondsTotal }: CountdownBarProps) {
    const pct = Math.max(0, Math.min(1, secondsRemaining / secondsTotal));
    const color = pct > 0.6 ? BRASS_300 : pct > 0.3 ? SEAL_WARNING : SEAL_RED;

    return (
        <div
            className="relative h-3 w-full"
            style={{
                background: INK_900,
                boxShadow: `inset 1px 1px 0 ${INK_500}, inset -1px -1px 0 ${INK_900}`,
            }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={secondsTotal}
            aria-valuenow={secondsRemaining}
            aria-label="Reconnect countdown"
        >
            <div
                className="h-full motion-reduce:transition-none motion-safe:transition-[width] motion-safe:duration-300"
                style={{ width: `${pct * 100}%`, background: color }}
            />
        </div>
    );
}
