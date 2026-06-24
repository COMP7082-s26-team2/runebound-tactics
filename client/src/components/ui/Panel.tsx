import type { ReactNode } from "react";

export type PanelSkin = "vellum" | "chamber";
export type SigilState = "idle" | "active" | "stamped";

interface PanelProps {
    skin?: PanelSkin;
    sigil?: ReactNode;
    sigilSide?: "left" | "right";
    sigilState?: SigilState;
    className?: string;
    children: ReactNode;
}

const SKIN_CLASSES: Record<PanelSkin, string> = {
    vellum:
        "bg-[var(--vellum-050)] text-[var(--ink-mark)] [box-shadow:var(--bevel-vellum)]",
    chamber:
        "bg-[var(--ink-700)] text-[var(--ink-300)] [box-shadow:var(--bevel-chamber)]",
};

export function Panel({
    skin = "vellum",
    sigil,
    sigilSide = "left",
    sigilState = "idle",
    className = "",
    children,
}: PanelProps) {
    return (
        <section
            className={`relative ${SKIN_CLASSES[skin]} ${className}`}
            data-sigil-state={sigilState}
        >
            {sigil && (
                <div
                    className={`absolute top-0 ${
                        sigilSide === "left" ? "left-0" : "right-0"
                    } p-1`}
                    data-sigil-slot
                >
                    {sigil}
                </div>
            )}
            {children}
        </section>
    );
}
