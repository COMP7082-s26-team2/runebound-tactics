"use client";

import { Client, getStateCallbacks } from "@colyseus/sdk";
import { useRoom } from "@colyseus/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TestRoomState } from "@runebound-tactics/shared";

// Module-level Client singleton — created once per module load, not per render.
const COLYSEUS_URL =
    process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";
const client = new Client(COLYSEUS_URL);

const TOKEN_KEY = "colyseus_test_reconnection_token";

interface PlayerEntry {
    sessionId: string;
    displayName: string;
}

interface MessageEntry {
    sender: string;
    text: string;
    timestamp: number;
}

export default function ColyseusTestPage() {
    const [displayName, setDisplayName] = useState("");
    // joinName + joinAttempt together drive the useRoom dep array.
    // joinAttempt increments on every Join click so retries re-trigger useRoom
    // even when the display name hasn't changed.
    const [joinName, setJoinName] = useState<string | null>(null);
    const [joinAttempt, setJoinAttempt] = useState(0);
    const [players, setPlayers] = useState<PlayerEntry[]>([]);
    const [messages, setMessages] = useState<MessageEntry[]>([]);
    const [inputText, setInputText] = useState("");
    const [isReconnecting, setIsReconnecting] = useState(false);
    const feedRef = useRef<HTMLDivElement>(null);

    // useRoom handles: join on mount, leave on unmount, and reconnect when deps change.
    // Passing null defers the connection until the user submits their name.
    const { room, error, isConnecting } = useRoom(
        joinName
            ? () => {
                  const token = sessionStorage.getItem(TOKEN_KEY);
                  if (token) {
                      // Attempt to resume the same server-side session after a hard refresh.
                      return client.reconnect(token).catch(() => {
                          sessionStorage.removeItem(TOKEN_KEY);
                          return client.joinOrCreate<TestRoomState>("test", {
                              displayName: joinName,
                          });
                      });
                  }
                  return client.joinOrCreate<TestRoomState>("test", {
                      displayName: joinName,
                  });
              }
            : null,
        [joinName, joinAttempt],
    );

    // Wire room state callbacks and lifecycle events once the room is obtained.
    useEffect(() => {
        if (!room) return;

        // Persist reconnection token — survives hard refresh, cleared on leave.
        sessionStorage.setItem(TOKEN_KEY, room.reconnectionToken);

        const $ = getStateCallbacks(room);

        // immediate: true fires for players/messages already in room at join time.
        $(room.state.players).onAdd((player, sessionId) => {
            setPlayers((prev) => [
                ...prev,
                { sessionId, displayName: player.displayName },
            ]);
        }, true);

        $(room.state.players).onRemove((_player, sessionId) => {
            setPlayers((prev) => prev.filter((p) => p.sessionId !== sessionId));
        });

        $(room.state.messages).onAdd((msg) => {
            setMessages((prev) => [
                ...prev,
                {
                    sender: msg.sender,
                    text: msg.text,
                    timestamp: msg.timestamp,
                },
            ]);
        }, true);

        // Unexpected disconnect — SDK will auto-reconnect; show overlay.
        room.onDrop(() => setIsReconnecting(true));
        room.onReconnect(() => setIsReconnecting(false));

        // Consented leave (or drop after max retries exceeded).
        room.onLeave(() => {
            sessionStorage.removeItem(TOKEN_KEY);
            setPlayers([]);
            setMessages([]);
            setIsReconnecting(false);
            setJoinName(null);
        });

        // Best-effort consented leave on tab close — server onDrop is the authoritative fallback.
        const handleUnload = () => room.leave();
        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, [room]);

    // Auto-scroll message feed on new messages.
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [messages]);

    const handleJoin = useCallback(() => {
        const name = displayName.trim();
        if (!name) return;
        setJoinName(name);
        setJoinAttempt((n) => n + 1);
    }, [displayName]);

    const handleSend = useCallback(() => {
        const text = inputText.trim();
        if (!text || !room) return;
        room.send("chat", { text });
        setInputText("");
    }, [inputText, room]);

    // room.leave() triggers room.onLeave which resets all state above.
    const handleLeave = useCallback(() => {
        room?.leave();
    }, [room]);

    if (room) {
        return (
            <RoomPanel
                roomId={room.roomId}
                isReconnecting={isReconnecting}
                players={players}
                messages={messages}
                inputText={inputText}
                feedRef={feedRef}
                onInputChange={setInputText}
                onSend={handleSend}
                onLeave={handleLeave}
            />
        );
    }

    return (
        <JoinPanel
            displayName={displayName}
            isJoining={isConnecting}
            error={error ? error.message : null}
            onDisplayNameChange={setDisplayName}
            onJoin={handleJoin}
        />
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface JoinPanelProps {
    displayName: string;
    isJoining: boolean;
    error: string | null;
    onDisplayNameChange: (v: string) => void;
    onJoin: () => void;
}

function JoinPanel({
    displayName,
    isJoining,
    error,
    onDisplayNameChange,
    onJoin,
}: JoinPanelProps) {
    return (
        <div
            style={{
                maxWidth: 400,
                margin: "80px auto",
                fontFamily: "monospace",
            }}
        >
            <h1>Colyseus Test Room</h1>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                    type="text"
                    placeholder="Display name"
                    maxLength={32}
                    value={displayName}
                    onChange={(e) => onDisplayNameChange(e.target.value)}
                    onKeyDown={(e) =>
                        e.key === "Enter" && !isJoining && onJoin()
                    }
                    disabled={isJoining}
                    style={{ flex: 1, padding: "6px 8px" }}
                />
                <button
                    onClick={onJoin}
                    disabled={isJoining || !displayName.trim()}
                    style={{ padding: "6px 12px" }}
                >
                    {isJoining ? "Joining…" : "Join"}
                </button>
            </div>
            {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}
        </div>
    );
}

interface RoomPanelProps {
    roomId: string;
    isReconnecting: boolean;
    players: PlayerEntry[];
    messages: MessageEntry[];
    inputText: string;
    feedRef: React.RefObject<HTMLDivElement | null>;
    onInputChange: (v: string) => void;
    onSend: () => void;
    onLeave: () => void;
}

function RoomPanel({
    roomId,
    isReconnecting,
    players,
    messages,
    inputText,
    feedRef,
    onInputChange,
    onSend,
    onLeave,
}: RoomPanelProps) {
    return (
        <div
            style={{
                maxWidth: 600,
                margin: "40px auto",
                fontFamily: "monospace",
                display: "flex",
                flexDirection: "column",
                gap: 16,
            }}
        >
            {isReconnecting && (
                <div
                    style={{
                        background: "#fff3cd",
                        border: "1px solid #ffc107",
                        padding: "6px 12px",
                        borderRadius: 4,
                        fontSize: 13,
                    }}
                >
                    Connection lost — reconnecting…
                </div>
            )}
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <span style={{ fontSize: 12, color: "#666" }}>
                    room: {roomId}
                </span>
                <button onClick={onLeave} style={{ padding: "4px 10px" }}>
                    Leave
                </button>
            </div>

            {/* Player list */}
            <div>
                <strong>Players ({players.length})</strong>
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 4,
                    }}
                >
                    {players.map((p) => (
                        <span
                            key={p.sessionId}
                            style={{
                                background: "#e0e0e0",
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 13,
                            }}
                        >
                            {p.displayName}
                        </span>
                    ))}
                </div>
            </div>

            {/* Message feed */}
            <div
                ref={feedRef}
                style={{
                    border: "1px solid #ccc",
                    height: 300,
                    overflowY: "auto",
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                }}
            >
                {messages.length === 0 && (
                    <span style={{ color: "#aaa", fontSize: 12 }}>
                        No messages yet.
                    </span>
                )}
                {messages.map((m, i) => (
                    <div key={i} style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: "bold" }}>{m.sender}</span>
                        <span
                            style={{
                                color: "#999",
                                fontSize: 11,
                                marginLeft: 6,
                            }}
                        >
                            {new Date(m.timestamp).toLocaleTimeString()}
                        </span>
                        <span style={{ marginLeft: 8 }}>{m.text}</span>
                    </div>
                ))}
            </div>

            {/* Chat input */}
            <div style={{ display: "flex", gap: 8 }}>
                <input
                    type="text"
                    placeholder="Message…"
                    maxLength={200}
                    value={inputText}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSend()}
                    style={{ flex: 1, padding: "6px 8px" }}
                />
                <button
                    onClick={onSend}
                    disabled={!inputText.trim()}
                    style={{ padding: "6px 12px" }}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
