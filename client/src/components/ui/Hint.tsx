import type { ReactNode } from "react";

export type HintTone = "default" | "error";

interface HintProps {
    id?: string;
    children: ReactNode;
    tone?: HintTone;
    className?: string;
}

const TONE_CLASSES: Record<HintTone, string> = {
    default: "text-[var(--ink-faded)]",
    error: "text-[var(--seal-red)]",
};

export function Hint({ id, children, tone = "default", className = "" }: HintProps) {
    return (
        <p id={id} className={`text-[var(--text-xs)] ${TONE_CLASSES[tone]} ${className}`}>
            {children}
        </p>
    );
}
