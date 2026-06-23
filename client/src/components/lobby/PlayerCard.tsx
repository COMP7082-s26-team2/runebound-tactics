"use client";

import { Panel } from "@/components/ui/Panel";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Sigil, type Faction } from "@/components/ui/Sigil";

interface PlayerCardProps {
    displayName: string;
    isReady: boolean;
    isMe: boolean;
    faction: string;
    slot: number;
}

function parseFaction(raw: string): Faction | null {
    if (raw === "castle") return "castle";
    if (raw === "necropolis") return "necropolis";
    return null;
}

export function PlayerCard({
    displayName,
    isReady,
    isMe,
    faction,
    slot,
}: PlayerCardProps) {
    const parsedFaction = parseFaction(faction);
    const sigilState = isReady ? "active" : "idle";

    return (
        <Panel
            skin="chamber"
            sigil={parsedFaction ? <Sigil faction={parsedFaction} size={28} state={sigilState} /> : null}
            sigilState={sigilState}
            className="p-5 flex flex-col gap-3"
        >
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--ink-800)] [box-shadow:var(--bevel-chamber)] flex items-center justify-center text-[var(--text-md)] text-[var(--ink-500)]">
                    {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex flex-col">
                    <span className="text-[var(--text-md)] font-bold text-[var(--vellum-050)] truncate">
                        {displayName}
                    </span>
                    <Eyebrow className="text-[var(--ink-500)]">
                        Slot {slot}{isMe ? " · You" : ""}
                    </Eyebrow>
                </div>
            </div>

            <div className="flex items-center justify-between gap-2">
                <Eyebrow className="text-[var(--ink-500)]">Status</Eyebrow>
                <Eyebrow className={isReady ? "text-[var(--brass-300)]" : "text-[var(--ink-500)]"}>
                    {isReady ? "Ready" : "Standing By"}
                </Eyebrow>
            </div>

            <div className="flex items-center justify-between gap-2">
                <Eyebrow className="text-[var(--ink-500)]">Faction</Eyebrow>
                <Eyebrow className={parsedFaction ? "text-[var(--brass-300)]" : "text-[var(--ink-500)]"}>
                    {parsedFaction ? parsedFaction : "Unbound"}
                </Eyebrow>
            </div>
        </Panel>
    );
}
