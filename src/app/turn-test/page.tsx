"use client";

import { useEffect, useRef, useState } from "react";
import { EventBus, TurnSystem } from "@/lib/engine";

const INITIAL_PARTICIPANTS = [
    { id: "Alice" },
    { id: "Bob" },
    { id: "Charlie" },
];

type LogEntry = { event: string; detail: string };

export default function TurnTest() {
    const tsRef = useRef<TurnSystem | null>(null);
    const busRef = useRef<EventBus | null>(null);

    const [started, setStarted] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [round, setRound] = useState(0);
    const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS.map((p) => p.id));
    const [log, setLog] = useState<LogEntry[]>([]);
    const [newId, setNewId] = useState("");

    const pushLog = (event: string, detail: string) =>
        setLog((prev) => [{ event, detail }, ...prev].slice(0, 30));

    useEffect(() => {
        const bus = new EventBus();
        const ts = new TurnSystem([...INITIAL_PARTICIPANTS], bus, false);

        const events = [
            "turn:start",
            "turn:begin",
            "turn:end",
            "turn:skip",
            "turn:round-end",
            "turn:sequence-end",
            "turn:participant-added",
            "turn:participant-removed",
        ] as const;

        const handlers: Array<() => void> = events.map((ev) => {
            const handler = (data: unknown) => {
                const d = data as Record<string, unknown>;
                const detail = [
                    d?.participant ? `participant=${JSON.stringify(d.participant)}` : null,
                    d?.round != null ? `round=${d.round}` : null,
                    d?.turnIndex != null ? `turnIndex=${d.turnIndex}` : null,
                ].filter(Boolean).join("  ");
                pushLog(ev, detail);

                setActiveId(ts.activeId);
                setRound(ts.round);
                setParticipants(ts.participants.map((p) => p.id));
                setStarted(ts.started);
            };
            bus.on(ev, handler);
            return () => bus.off(ev, handler);
        });

        tsRef.current = ts;
        busRef.current = bus;

        return () => {
            handlers.forEach((off) => off());
        };
    }, []);

    const syncState = () => {
        const ts = tsRef.current;
        if (!ts) return;
        setStarted(ts.started);
        setActiveId(ts.activeId);
    };

    const handleStart = () => {
        const ts = tsRef.current;
        if (!ts) return;
        try {
            ts.start(participants[0]);
            syncState();
        } catch (e) {
            pushLog("error", String(e));
        }
    };

    const handleEndTurn = () => {
        const ts = tsRef.current;
        if (!ts) return;
        try {
            ts.endTurn();
        } catch (e) {
            pushLog("error", String(e));
        }
    };

    const handleSkip = (id: string) => {
        tsRef.current?.skipTurn(id);
    };

    const handleRemove = (id: string) => {
        const ts = tsRef.current;
        if (!ts) return;
        ts.removeParticipant(id);
        setParticipants(ts.participants.map((p) => p.id));
    };

    const handleAdd = () => {
        const ts = tsRef.current;
        if (!ts || !newId.trim()) return;
        try {
            ts.addParticipant({ id: newId.trim() });
            setParticipants(ts.participants.map((p) => p.id));
            setNewId("");
        } catch (e) {
            pushLog("error", String(e));
        }
    };

    const handleReset = () => {
        tsRef.current?.reset();
        syncState();
        setRound(0);
        pushLog("reset", "TurnSystem reset");
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono p-8 flex gap-8">
            <div className="flex flex-col gap-6 w-72 shrink-0">
                <div>
                    <h1 className="text-lg font-bold mb-1">Turn System Test</h1>
                    <p className="text-xs text-zinc-400">loop=false (one sequence per start)</p>
                </div>

                <div className="bg-zinc-900 rounded p-4 flex flex-col gap-1 text-sm">
                    <div>
                        <span className="text-zinc-500">status </span>
                        <span className={started ? "text-green-400" : "text-zinc-400"}>
                            {started ? "running" : "stopped"}
                        </span>
                    </div>
                    <div>
                        <span className="text-zinc-500">active  </span>
                        <span className="text-yellow-300">{activeId ?? "—"}</span>
                    </div>
                    <div>
                        <span className="text-zinc-500">round   </span>
                        <span>{round}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleStart}
                        disabled={started}
                        className="px-3 py-2 rounded bg-green-700 hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                    >
                        Start
                    </button>
                    <button
                        onClick={handleEndTurn}
                        disabled={!started}
                        className="px-3 py-2 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                    >
                        End Turn
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-3 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm"
                    >
                        Reset
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Participants</p>
                    {participants.map((id) => (
                        <div
                            key={id}
                            className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                                id === activeId
                                    ? "bg-yellow-900 text-yellow-200"
                                    : "bg-zinc-800"
                            }`}
                        >
                            <span>{id}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleSkip(id)}
                                    disabled={!started}
                                    className="text-xs text-zinc-400 hover:text-white disabled:opacity-30"
                                >
                                    skip
                                </button>
                                <button
                                    onClick={() => handleRemove(id)}
                                    className="text-xs text-red-400 hover:text-red-300"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="flex gap-2 mt-1">
                        <input
                            value={newId}
                            onChange={(e) => setNewId(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            placeholder="new id..."
                            className="flex-1 rounded bg-zinc-800 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-zinc-500"
                        />
                        <button
                            onClick={handleAdd}
                            className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-sm"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Event log</p>
                <div className="flex-1 bg-zinc-900 rounded p-4 overflow-y-auto text-xs flex flex-col gap-1">
                    {log.length === 0 && (
                        <span className="text-zinc-600">no events yet — press Start</span>
                    )}
                    {log.map((entry, i) => (
                        <div key={i} className="flex gap-3">
                            <span className="text-purple-400 shrink-0">{entry.event}</span>
                            <span className="text-zinc-400">{entry.detail}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
