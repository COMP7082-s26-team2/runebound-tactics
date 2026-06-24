import { forwardRef } from "react";
import { Sigil, type Faction } from "@/components/ui/Sigil";

export type { Faction } from "@/components/ui/Sigil";

export type CardKind = "negate" | "counter" | "evade" | (string & {});

export type CardSize = "default" | "compact";

interface CardProps {
    name: string;
    kind: CardKind;
    cost: number | null;
    description: string;
    affordable: boolean;
    disabled?: boolean;
    selected?: boolean;
    factionInk?: Faction | null;
    onActivate: () => void;
    className?: string;
    tabIndex?: 0 | -1;
    size?: CardSize;
}

const KIND_GLYPH: Record<string, string> = {
    negate: "●",
    counter: "✕",
    evade: "→",
};

function glyphFor(kind: CardKind): string {
    return KIND_GLYPH[kind] ?? "◆";
}

export const Card = forwardRef<HTMLButtonElement, CardProps>(function Card(
    {
        name,
        kind,
        cost,
        description,
        affordable,
        disabled = false,
        selected = false,
        factionInk = null,
        onActivate,
        className = "",
        tabIndex,
        size = "default",
    },
    ref,
) {
    const isBlocked = !affordable || disabled;

    const costColor = affordable
        ? "text-[var(--brass-500)]"
        : "text-[var(--seal-red)]";

    const hoverClasses = isBlocked
        ? ""
        : "motion-safe:hover:translate-y-[-3px] hover:[outline:1px_solid_var(--brass-500)]";

    const blockedFace = isBlocked
        ? "[filter:saturate(0.6)] opacity-80 cursor-not-allowed"
        : "cursor-pointer";

    const selectedOutline = selected
        ? "[outline:2px_solid_var(--brass-500)] [outline-offset:-2px]"
        : "";

    const ariaLabel = `${name}, ${cost ?? "no"} gold, ${
        affordable ? "playable" : "unaffordable"
    }`;

    const handleClick = () => {
        if (isBlocked) return;
        onActivate();
    };

    if (size === "compact") {
        // Compact rail chip — 120w × 56h. Sigil + cost in a top mini-row,
        // kind glyph + name on a single horizontal row beneath. No description
        // (covered by the strip's eyebrow/hint slot). Fits inside the 70px
        // single-height strip alongside the bar + Pass.
        return (
            <button
                ref={ref}
                type="button"
                onClick={handleClick}
                tabIndex={tabIndex}
                aria-disabled={isBlocked}
                aria-pressed={selected ? true : undefined}
                aria-label={ariaLabel}
                className={
                    "relative inline-flex flex-col w-[120px] h-[56px] px-2 py-1 gap-0.5 " +
                    "bg-[var(--vellum-050)] [box-shadow:var(--bevel-vellum)] " +
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-300)] " +
                    `${hoverClasses} ${blockedFace} ${selectedOutline} ${className}`
                }
            >
                <div className="flex items-center justify-between w-full">
                    <div className="w-4 h-4 flex items-center justify-center">
                        {factionInk ? (
                            <Sigil
                                faction={factionInk}
                                size={12}
                                state="idle"
                            />
                        ) : null}
                    </div>
                    {cost !== null ? (
                        <div
                            className={`${costColor} font-bold text-[var(--text-2xs)] [font-variant-numeric:tabular-nums] leading-none flex items-center gap-0.5`}
                        >
                            <span aria-hidden="true">{"◆"}</span>
                            <span>{cost}</span>
                        </div>
                    ) : null}
                </div>
                <div className="flex-1 flex items-center gap-1 min-w-0">
                    <span
                        className="text-[18px] leading-none text-[var(--ink-mark)] shrink-0"
                        aria-hidden="true"
                    >
                        {glyphFor(kind)}
                    </span>
                    <span className="font-[family-name:var(--font-display)] italic text-[var(--text-sm)] text-[var(--ink-mark)] truncate leading-none">
                        {name}
                    </span>
                </div>
            </button>
        );
    }

    return (
        <button
            ref={ref}
            type="button"
            onClick={handleClick}
            tabIndex={tabIndex}
            aria-disabled={isBlocked}
            aria-pressed={selected ? true : undefined}
            aria-label={ariaLabel}
            className={
                "relative inline-flex flex-col w-[88px] h-[128px] p-2 " +
                "bg-[var(--vellum-050)] [box-shadow:var(--bevel-vellum)] " +
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-300)] " +
                `${hoverClasses} ${blockedFace} ${selectedOutline} ${className}`
            }
        >
            <div className="flex items-start justify-between w-full">
                <div className="w-5 h-5 flex items-center justify-center">
                    {factionInk ? (
                        <Sigil faction={factionInk} size={20} state="idle" />
                    ) : null}
                </div>
                {cost !== null ? (
                    <div
                        className={`${costColor} font-bold text-[var(--text-sm)] [font-variant-numeric:tabular-nums] leading-none flex items-center gap-0.5`}
                    >
                        <span aria-hidden="true">{"◆"}</span>
                        <span>{cost}</span>
                    </div>
                ) : null}
            </div>

            <div
                className="flex-1 flex items-center justify-center text-[32px] leading-none text-[var(--ink-mark)]"
                aria-hidden="true"
            >
                {glyphFor(kind)}
            </div>

            <div className="w-full flex flex-col gap-0.5 min-w-0">
                <div className="font-[family-name:var(--font-display)] italic text-[var(--text-md)] text-[var(--ink-mark)] truncate leading-none">
                    {name}
                </div>
                <div className="text-[var(--text-2xs)] text-[var(--ink-faded)] truncate leading-none">
                    {description}
                </div>
            </div>
        </button>
    );
});

Card.displayName = "Card";
