"use client";

interface GameReconnectOverlayProps {
    visible: boolean;
}

/**
 * Blocks game interaction while the replacement Colyseus room is joining and
 * waiting for its first authoritative state update.
 */
export function GameReconnectOverlay({
    visible,
}: GameReconnectOverlayProps) {
    if (!visible) {
        return null;
    }

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
                <span className="font-medium">Reconnecting...</span>
            </div>
        </div>
    );
}
