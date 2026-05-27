"use client";

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
}

export function SlotList({ players, maxPlayers, mySessionId }: Props) {
    const slots = Array.from({ length: maxPlayers }, (_, i) => i + 1);
    const bySlot = new Map<number, SlotInfo>();
    for (const p of Object.values(players)) {
        bySlot.set(p.slot, p);
    }

    return (
        <ul className="flex flex-col gap-1">
            {slots.map(slot => {
                const occupant = bySlot.get(slot);
                const isMe = occupant?.sessionId === mySessionId;
                return (
                    <li key={slot} className="text-white">
                        Slot {slot}:{" "}
                        {occupant ? (
                            <>
                                {occupant.displayName}
                                {isMe && " (you)"} — {occupant.faction || "—"} —{" "}
                                {occupant.isReady ? "✓ Ready" : "Not Ready"}
                            </>
                        ) : (
                            <span className="text-gray-500">&lt;empty&gt;</span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
