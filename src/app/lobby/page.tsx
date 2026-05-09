"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LobbyService, LobbyListService, PlayerSlot, LobbySummary } from "@/lib/multiplayer";
import {
    CreateLobbyForm,
    JoinLobbyForm,
    LobbyList,
    LobbyWaitingRoom,
} from "@/components/lobby";

type PageState =
    | "menu"
    | "list"
    | "create-form"
    | "creating"
    | "joining"
    | "waiting"
    | "starting";

export default function LobbyPage() {
    const router = useRouter();
    const lobbyService = useRef(LobbyService.getInstance());
    const lobbyListService = useRef(LobbyListService.getInstance());

    const [pageState, setPageState] = useState<PageState>("menu");
    const [error, setError] = useState<string | null>(null);
    const [lobbies, setLobbies] = useState<LobbySummary[]>([]);
    const [players, setPlayers] = useState<PlayerSlot[]>([]);
    const [lobbyName, setLobbyName] = useState("");
    const [maxPlayers, setMaxPlayers] = useState(2);
    const [roomId, setRoomId] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [isReady, setIsReady] = useState(false);
    const [prefillCode, setPrefillCode] = useState("");

    // Connect to lobby list when on "list" view
    useEffect(() => {
        if (pageState !== "list") return;

        const svc = lobbyListService.current;
        let unsub: (() => void) | undefined;

        svc.connect().then(() => {
            unsub = svc.onListChange(setLobbies);
        });

        return () => {
            unsub?.();
            svc.disconnect();
        };
    }, [pageState]);

    async function handleCreate(
        displayName: string,
        name: string,
        max: 2 | 3 | 4
    ) {
        setError(null);
        setPageState("creating");
        try {
            const svc = lobbyService.current;
            const id = await svc.createRoom(displayName, name, max);
            setRoomId(id);
            setLobbyName(name);
            setMaxPlayers(max);
            setSessionId(svc.sessionId ?? "");
            registerRoomListeners();
            setPageState("waiting");
        } catch {
            setError("Failed to create lobby. Please try again.");
            setPageState("create-form");
        }
    }

    async function handleJoin(code: string, displayName: string) {
        setError(null);
        setPageState("joining");
        try {
            const svc = lobbyService.current;
            await svc.joinRoom(code, displayName);
            setRoomId(svc.roomId ?? code);
            setSessionId(svc.sessionId ?? "");
            registerRoomListeners();
            setPageState("waiting");
        } catch (e: unknown) {
            const msg =
                e instanceof Error && e.message.toLowerCase().includes("full")
                    ? "Room is full."
                    : "Room not found.";
            setError(msg);
            setPageState("menu");
        }
    }

    function handleJoinFromList(id: string) {
        // Pre-fill the code and switch to join form so user can enter their name
        setPrefillCode(id);
        setPageState("menu");
    }

    function registerRoomListeners() {
        const svc = lobbyService.current;

        svc.onStateChange((state) => {
            setPlayers(state.players ?? []);
            setLobbyName(state.lobbyName);
            setMaxPlayers(state.maxPlayers);

            const me = (state.players ?? []).find(
                (p) => p.sessionId === lobbyService.current.sessionId
            );
            setIsReady(me?.ready ?? false);
        });

        svc.onMatchStart(({ roomId: id }) => {
            setRoomId(id);
            setPageState("starting");
            router.push(`/game?roomId=${id}`);
        });
    }

    function handleReady() {
        lobbyService.current.setReady();
    }

    function handleUnready() {
        lobbyService.current.setUnready();
    }

    function handleLeave() {
        lobbyService.current.leave();
        setPlayers([]);
        setRoomId("");
        setSessionId("");
        setIsReady(false);
        setError(null);
        setPrefillCode("");
        setPageState("menu");
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
            <h1 className="text-3xl font-bold text-amber-500 mb-8 tracking-wide">
                RUNEBOUND TACTICS
            </h1>

            {/* MENU */}
            {pageState === "menu" && (
                <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}
                    <button
                        onClick={() => setPageState("list")}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded transition-colors"
                    >
                        Browse Lobbies
                    </button>
                    <button
                        onClick={() => setPageState("create-form")}
                        className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded transition-colors"
                    >
                        Create Lobby
                    </button>
                    <div className="w-full border-t border-zinc-700 pt-4">
                        <JoinLobbyForm
                            onSubmit={handleJoin}
                            isLoading={false}
                            prefillCode={prefillCode}
                        />
                    </div>
                </div>
            )}

            {/* BROWSE LIST */}
            {pageState === "list" && (
                <div className="w-full max-w-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold">Open Lobbies</h2>
                        <button
                            onClick={() => setPageState("menu")}
                            className="text-zinc-400 hover:text-white text-sm transition-colors"
                        >
                            ← Back
                        </button>
                    </div>
                    <LobbyList
                        lobbies={lobbies}
                        onJoin={handleJoinFromList}
                        isLoading={false}
                    />
                </div>
            )}

            {/* CREATE FORM */}
            {pageState === "create-form" && (
                <div className="w-full max-w-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold">Create Lobby</h2>
                        <button
                            onClick={() => setPageState("menu")}
                            className="text-zinc-400 hover:text-white text-sm transition-colors"
                        >
                            ← Back
                        </button>
                    </div>
                    <CreateLobbyForm onSubmit={handleCreate} isLoading={false} />
                </div>
            )}

            {/* CREATING / JOINING loading */}
            {(pageState === "creating" || pageState === "joining") && (
                <p className="text-zinc-400 animate-pulse">
                    {pageState === "creating" ? "Creating lobby..." : "Joining lobby..."}
                </p>
            )}

            {/* WAITING ROOM */}
            {(pageState === "waiting" || pageState === "starting") && (
                <LobbyWaitingRoom
                    roomId={roomId}
                    lobbyName={lobbyName}
                    players={players}
                    maxPlayers={maxPlayers}
                    localSessionId={sessionId}
                    isReady={isReady}
                    isStarting={pageState === "starting"}
                    onReady={handleReady}
                    onUnready={handleUnready}
                    onLeave={handleLeave}
                />
            )}
        </main>
    );
}
