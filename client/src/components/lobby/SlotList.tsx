"use client";

import { PlayerCard } from "./PlayerCard";
import { Panel } from "@/components/ui/Panel";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";

interface SlotInfo {
    sessionId: string;
    displayName: string;
    isReady: boolean;
    slot: number;
    faction: string;
}

interface Props {
    players: Readonly<Record<string, SlotInfo>>;
    maxPlayers: number;
    mySessionId: string;
    onInvite?: (slot: number) => void;
}

export function SlotList({ players, maxPlayers, mySessionId, onInvite }: Props) {
    const slots = Array.from({ length: maxPlayers }, (_, i) => i + 1);
    const bySlot = new Map<number, SlotInfo>();
    for (const p of Object.values(players)) {
        bySlot.set(p.slot, p);
    }

    return (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {slots.map((slot) => {
                const occupant = bySlot.get(slot);
                if (occupant) {
                    return (
                        <li key={slot}>
                            <PlayerCard
                                displayName={occupant.displayName}
                                isReady={occupant.isReady}
                                isMe={occupant.sessionId === mySessionId}
                                faction={occupant.faction}
                                slot={occupant.slot}
                            />
                        </li>
                    );
                }
                return (
                    <li key={slot}>
                        <Panel
                            skin="chamber"
                            className="p-5 flex flex-col gap-3 opacity-70 border-2 border-dashed border-[var(--ink-500)]"
                        >
                            <div className="flex items-center justify-between">
                                <Eyebrow className="text-[var(--ink-500)]">Slot {slot}</Eyebrow>
                                <Eyebrow className="text-[var(--ink-faded)]">Empty</Eyebrow>
                            </div>
                            <Button
                                intent="secondary"
                                size="sm"
                                onClick={onInvite ? () => onInvite(slot) : undefined}
                                disabled={!onInvite}
                                className="w-full"
                            >
                                + Invite a Tactician
                            </Button>
                        </Panel>
                    </li>
                );
            })}
        </ul>
    );
}
