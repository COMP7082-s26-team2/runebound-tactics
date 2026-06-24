"use client";

import { useEffect, useState } from "react";
import { getReconnectWindowSeconds } from "@/lib/multiplayer/reconnect";

const MILLISECONDS_PER_SECOND = 1_000;
const COUNTDOWN_UPDATE_INTERVAL_MS = 250;

/**
 * Blocks game interaction while the replacement Colyseus room is joining and
 * waiting for its first authoritative state update.
 */
export function GameReconnectOverlay() {
    const reconnectWindowSeconds = getReconnectWindowSeconds();
    const [secondsRemaining, setSecondsRemaining] = useState(
        reconnectWindowSeconds,
    );

    useEffect(() => {
        // Calculate from a fixed deadline instead of decrementing state so
        // delayed browser timers cannot make the warning drift.
        const deadline =
            Date.now() +
            reconnectWindowSeconds * MILLISECONDS_PER_SECOND;
        const updateCountdown = () => {
            const remainingMs = Math.max(0, deadline - Date.now());
            setSecondsRemaining(
                Math.ceil(remainingMs / MILLISECONDS_PER_SECOND),
            );
        };

        const intervalId = window.setInterval(
            updateCountdown,
            COUNTDOWN_UPDATE_INTERVAL_MS,
        );

        return () => {
            window.clearInterval(intervalId);
        };
    }, [reconnectWindowSeconds]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
            role="status"
            aria-live="polite"
            aria-label="Reconnecting to game"
        >
            <div className="flex items-center gap-3 text-white">
                <span
                    className="size-6 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden="true"
                />
                <div>
                    <div className="font-medium">Reconnecting...</div>
                    <div className="text-sm text-white/80">
                        {secondsRemaining > 0
                            ? `You will forfeit in ${secondsRemaining} ${secondsRemaining === 1 ? "second" : "seconds"}.`
                            : "Reconnect window expired. Returning to lobbies..."}
                    </div>
                </div>
            </div>
        </div>
    );
}
