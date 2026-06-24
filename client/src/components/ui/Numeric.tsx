import type { ReactNode } from "react";

export type NumericSize = "sm" | "md" | "lg" | "xl";
export type NumericTone = "default" | "brass" | "faded";

interface NumericProps {
    children: ReactNode;
    size?: NumericSize;
    tone?: NumericTone;
    className?: string;
}

const SIZE_CLASSES: Record<NumericSize, string> = {
    sm: "text-[var(--text-xs)]",
    md: "text-[var(--text-sm)]",
    lg: "text-[var(--text-lg)]",
    xl: "text-[var(--text-2xl)]",
};

const TONE_CLASSES: Record<NumericTone, string> = {
    default: "",
    brass: "text-[var(--brass-500)]",
    faded: "text-[var(--ink-faded)]",
};

export function Numeric({
    children,
    size = "md",
    tone = "default",
    className = "",
}: NumericProps) {
    return (
        <span
            className={`font-[family-name:var(--font-mono)] tabular-nums [font-feature-settings:'tnum'_1] ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${className}`}
        >
            {children}
        </span>
    );
}
