import type { ReactNode } from "react";

export type DividerTone = "vellum" | "chamber";

interface DividerProps {
    tone?: DividerTone;
    ornament?: ReactNode;
    className?: string;
}

const TONE_BORDER: Record<DividerTone, string> = {
    vellum: "border-[var(--vellum-400)]",
    chamber: "border-[var(--ink-500)]",
};

export function Divider({
    tone = "vellum",
    ornament,
    className = "",
}: DividerProps) {
    if (ornament) {
        return (
            <div
                role="separator"
                className={`flex items-center gap-2 ${className}`}
            >
                <span className={`flex-1 border-t ${TONE_BORDER[tone]}`} />
                <span className="text-[var(--ink-faded)]">{ornament}</span>
                <span className={`flex-1 border-t ${TONE_BORDER[tone]}`} />
            </div>
        );
    }
    return (
        <hr
            className={`border-0 border-t ${TONE_BORDER[tone]} ${className}`}
        />
    );
}
