import type { CSSProperties } from "react";

export type Faction = "castle" | "necropolis";
export type SigilSize = 12 | 20 | 28 | 64;
export type SigilState = "idle" | "active" | "stamped";

interface SigilProps {
    faction: Faction;
    size?: SigilSize;
    state?: SigilState;
    className?: string;
}

const STATE_STYLE: Record<SigilState, CSSProperties> = {
    idle: { opacity: 0.6 },
    active: { opacity: 1 },
    stamped: {
        opacity: 1,
        animation: "sigil-stamp var(--dur-380) var(--ease-step-4) both",
    },
};

export function Sigil({
    faction,
    size = 28,
    state = "idle",
    className = "",
}: SigilProps) {
    return (
        <img
            src={`/assets/sigils/${faction}.svg`}
            alt=""
            aria-hidden="true"
            width={size}
            height={size}
            className={`[image-rendering:pixelated] ${className}`}
            style={STATE_STYLE[state]}
            data-faction={faction}
            data-state={state}
        />
    );
}
