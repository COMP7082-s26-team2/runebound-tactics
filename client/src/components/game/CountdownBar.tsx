"use client";

interface CountdownBarProps {
    secondsRemaining: number;
    secondsTotal: number;
    className?: string;
}

export function CountdownBar({
    secondsRemaining,
    secondsTotal,
    className = "",
}: CountdownBarProps) {
    const pct = Math.max(0, Math.min(1, secondsRemaining / secondsTotal));
    const color =
        pct > 0.6
            ? "var(--brass-300)"
            : pct > 0.3
                ? "var(--brass-500)"
                : "var(--seal-red)";

    return (
        <div
            className={`relative h-3 w-full max-w-[700px] bg-[var(--ink-800)] [box-shadow:var(--bevel-chamber)] flex justify-center items-center ${className}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={secondsTotal}
            aria-valuenow={secondsRemaining}
            aria-label="Reaction countdown"
        >
            <div
                className="h-full motion-reduce:transition-none motion-safe:transition-[width] motion-safe:duration-300 motion-safe:[transition-timing-function:steps(1,end)]"
                style={{ width: `${pct * 100}%`, background: color }}
            />
            <span className="absolute text-[var(--brass-300)] text-[10px] leading-none pointer-events-none">
                ◆
            </span>
        </div>
    );
}
