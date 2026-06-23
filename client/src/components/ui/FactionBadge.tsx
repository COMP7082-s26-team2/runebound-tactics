import { Sigil, type Faction } from "./Sigil";
import { Eyebrow } from "./Eyebrow";

export type FactionBadgeSize = "sm" | "md";

interface FactionBadgeProps {
    faction: Faction;
    label?: string;
    size?: FactionBadgeSize;
    className?: string;
}

const SIGIL_SIZE: Record<FactionBadgeSize, 12 | 20> = {
    sm: 12,
    md: 20,
};

const BORDER: Record<Faction, string> = {
    castle: "border-[var(--castle-ink)]",
    necropolis: "border-[var(--necro-ink)]",
};

const FACTION_LABEL: Record<Faction, string> = {
    castle: "Castle",
    necropolis: "Necropolis",
};

export function FactionBadge({
    faction,
    label,
    size = "md",
    className = "",
}: FactionBadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-[var(--radius-pill)] ${BORDER[faction]} ${className}`}
        >
            <Sigil faction={faction} size={SIGIL_SIZE[size]} state="active" />
            <Eyebrow>{label ?? FACTION_LABEL[faction]}</Eyebrow>
        </span>
    );
}
