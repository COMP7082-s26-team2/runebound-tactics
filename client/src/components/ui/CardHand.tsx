import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Card, type CardKind, type CardSize, type Faction } from "@/components/ui/Card";

export interface CardData {
    id?: string;
    name: string;
    kind: CardKind;
    cost: number | null;
    description: string;
    factionInk?: Faction | null;
}

interface CardHandProps {
    cards: CardData[];
    playerGold: number;
    onPlay: (cardName: string) => void;
    className?: string;
    /** Per-card animation-delay step in ms for the reaction-rail-enter keyframe. 0 disables stagger. */
    staggerEnterMs?: number;
    /** Card size variant. "compact" fits the rail; "default" is full 88x128. */
    cardSize?: CardSize;
}

export function CardHand({
    cards,
    playerGold,
    onPlay,
    className = "",
    staggerEnterMs = 0,
    cardSize = "default",
}: CardHandProps) {
    const [focusedIndex, setFocusedIndex] = useState(0);
    const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const lastKeyRef = useRef<string | null>(null);

    // Render-time clamp — if the parent shrinks the hand below the stale
    // focusedIndex, the rendered tabIndex/focus target falls back to the last
    // available card without a setState-in-effect cascade.
    const effectiveIndex =
        cards.length === 0 ? 0 : Math.min(focusedIndex, cards.length - 1);

    // Only focus on key-driven changes — prevents focus-steal on mount and on prop-driven `focusedIndex` updates.
    useEffect(() => {
        if (lastKeyRef.current === null) return;
        cardRefs.current[effectiveIndex]?.focus();
        lastKeyRef.current = null;
    }, [effectiveIndex]);

    if (cards.length === 0) {
        return null;
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
        switch (event.key) {
            case "ArrowLeft": {
                event.preventDefault();
                lastKeyRef.current = event.key;
                setFocusedIndex(Math.max(0, effectiveIndex - 1));
                break;
            }
            case "ArrowRight": {
                event.preventDefault();
                lastKeyRef.current = event.key;
                setFocusedIndex(Math.min(cards.length - 1, effectiveIndex + 1));
                break;
            }
            case "Home": {
                event.preventDefault();
                lastKeyRef.current = event.key;
                setFocusedIndex(0);
                break;
            }
            case "End": {
                event.preventDefault();
                lastKeyRef.current = event.key;
                setFocusedIndex(cards.length - 1);
                break;
            }
            default:
                break;
        }
    };

    return (
        <ul
            role="toolbar"
            aria-label="Reaction cards"
            onKeyDown={handleKeyDown}
            className={
                "flex flex-row items-stretch gap-2 overflow-x-auto " +
                "list-none m-0 p-0 " +
                className
            }
        >
            {cards.map((card, i) => (
                <li
                    key={card.id ?? `${card.name}-${i}`}
                    role="presentation"
                    className={
                        staggerEnterMs > 0
                            ? "flex [animation:reaction-rail-enter_220ms_steps(3,end)_both]"
                            : "flex"
                    }
                    style={
                        staggerEnterMs > 0
                            ? { animationDelay: `${i * staggerEnterMs}ms` }
                            : undefined
                    }
                >
                    <Card
                        ref={(node) => {
                            cardRefs.current[i] = node;
                        }}
                        name={card.name}
                        kind={card.kind}
                        cost={card.cost}
                        description={card.description}
                        factionInk={card.factionInk ?? null}
                        affordable={playerGold >= (card.cost ?? 0)}
                        onActivate={() => onPlay(card.name)}
                        tabIndex={effectiveIndex === i ? 0 : -1}
                        size={cardSize}
                    />
                </li>
            ))}
        </ul>
    );
}
