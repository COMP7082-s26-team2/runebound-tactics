import type { ReactNode } from "react";

type Delta = "up" | "down" | null;

interface StatProps {
    label: ReactNode;
    value: ReactNode;
    delta?: Delta;
    className?: string;
}

const DELTA_GLYPH: Record<Exclude<Delta, null>, string> = {
    up: "▲",
    down: "▼",
};

const DELTA_TONE: Record<Exclude<Delta, null>, string> = {
    up: "text-[var(--brass-500)]",
    down: "text-[var(--seal-red)]",
};

export function Stat({ label, value, delta = null, className = "" }: StatProps) {
    return (
        <div className={`flex items-baseline justify-between gap-2 ${className}`}>
            <span className="min-w-0">{label}</span>
            <span className="flex items-baseline gap-1 tabular-nums">
                {value}
                {delta && (
                    <span className={`text-[var(--text-xs)] ${DELTA_TONE[delta]}`}>
                        {DELTA_GLYPH[delta]}
                    </span>
                )}
            </span>
        </div>
    );
}
