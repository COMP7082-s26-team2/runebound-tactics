import { Room, Client, matchMaker } from "colyseus";
import { LobbyPlayerSlot, LobbyState, ROOM_GAME } from "@runebound-tactics/shared";
import type { Faction, LobbySummary } from "@runebound-tactics/shared";
import { pendingGames } from "./pendingGames";

interface JoinOptions {
    displayName?: string;
}

interface SetReadyPayload {
    isReady: boolean;
}

interface SetFactionPayload {
    faction: string;
}

interface SetLobbyNamePayload {
    name: string;
}

const VALID_FACTIONS: ReadonlySet<Faction> = new Set(["castle", "necropolis"]);
const COUNTDOWN_SECONDS = 5;

export class LobbyRoom extends Room<{ state: LobbyState }> {
    private _countdownTimer: ReturnType<typeof setInterval> | null = null;
    private _countdownRemaining = 0;
    private _hostSessionId = "";

    onCreate(options?: { lobbyName?: string; maxPlayers?: number }): void {
        const state = new LobbyState();
        state.lobbyName = (options?.lobbyName ?? "Lobby").trim().slice(0, 32) || "Lobby";
        state.maxPlayers = Math.min(4, Math.max(2, options?.maxPlayers ?? 2));
        this.setState(state);
        this.maxClients = state.maxPlayers;

        this.onMessage<SetReadyPayload>("set_ready", (client, payload) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;
            player.isReady = !!payload?.isReady;
            this._checkAllReady();
        });

        this.onMessage<SetFactionPayload>("set_faction", (client, payload) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;
            if (!VALID_FACTIONS.has(payload?.faction as Faction)) return;
            player.faction = payload.faction;
        });

        this.onMessage<SetLobbyNamePayload>("set_lobby_name", (client, payload) => {
            if (client.sessionId !== this._hostSessionId) return;
            const name = payload?.name?.trim().slice(0, 32);
            if (!name) return;
            this.state.lobbyName = name;
            this._updateMetadata();
        });
    }

    onJoin(client: Client, options?: JoinOptions): void {
        if (this.state.status === "transferring") {
            throw new Error("Game is already starting");
        }

        let displayName = String(options?.displayName ?? "Player").slice(0, 32);
        const usedNames = new Set([...this.state.players.values()].map(p => p.displayName));
        if (usedNames.has(displayName)) {
            let suffix = 2;
            while (usedNames.has(`${displayName} (${suffix})`)) suffix++;
            displayName = `${displayName} (${suffix})`.slice(0, 32);
        }

        const usedSlots = new Set([...this.state.players.values()].map(p => p.slot));
        const nextSlot = Array.from(
            { length: this.state.maxPlayers },
            (_, i) => i + 1,
        ).find(s => !usedSlots.has(s));

        if (nextSlot === undefined) {
            throw new Error("Lobby is full");
        }

        const slot = new LobbyPlayerSlot();
        slot.sessionId = client.sessionId;
        slot.displayName = displayName;
        slot.slot = nextSlot;
        this.state.players.set(client.sessionId, slot);

        if (this.state.players.size === 1) {
            this._hostSessionId = client.sessionId;
        }

        this._updateMetadata();
        console.log(`[LobbyRoom] ${displayName} joined slot ${nextSlot} (${client.sessionId})`);
    }

    async onDrop(client: Client, code?: number): Promise<void> {
        try {
            await this.allowReconnection(client, 30);
            console.log(`[LobbyRoom] ${client.sessionId} reconnected`);
        } catch {
            console.log(`[LobbyRoom] ${client.sessionId} reconnect window expired (code ${code})`);
            this._removePlayer(client.sessionId);
        }
    }

    onLeave(client: Client): void {
        this._removePlayer(client.sessionId);
    }

    onDispose(): void {
        this._cancelCountdown();
    }

    private _removePlayer(sessionId: string): void {
        const player = this.state.players.get(sessionId);
        console.log(`[LobbyRoom] ${player?.displayName ?? sessionId} left`);
        this.state.players.delete(sessionId);

        if (sessionId === this._hostSessionId) {
            const next = this.state.players.keys().next().value as string | undefined;
            this._hostSessionId = next ?? "";
        }

        this._cancelCountdown();
        this._updateMetadata();
    }

    private _checkAllReady(): void {
        const players = [...this.state.players.values()];
        if (players.length < 2) return;
        if (!players.every(p => p.isReady)) return;
        if (this.state.status !== "waiting") return;
        this._startCountdown();
    }

    private _startCountdown(): void {
        this.state.status = "starting";
        this._countdownRemaining = COUNTDOWN_SECONDS;
        this.broadcast("countdown", { seconds: this._countdownRemaining });

        this._countdownTimer = setInterval(() => {
            this._countdownRemaining--;
            this.broadcast("countdown", { seconds: this._countdownRemaining });

            if (this._countdownRemaining <= 0) {
                this._cancelCountdown(false);
                this._startGame().catch(err => {
                    console.error("[LobbyRoom] Failed to start game:", err);
                    this.state.status = "waiting";
                });
            }
        }, 1000);
    }

    private _cancelCountdown(resetStatus = true): void {
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
        }
        if (resetStatus && this.state.status === "starting") {
            this.state.status = "waiting";
            this.broadcast("countdown_cancelled", {});
        }
    }

    private async _startGame(): Promise<void> {
        this.state.status = "transferring";

        const players = [...this.state.players.values()].map(p => ({
            displayName: p.displayName,
            faction: p.faction,
        }));

        pendingGames.set(this.roomId, { players });
        const roomData = await matchMaker.createRoom(ROOM_GAME, { lobbyRoomId: this.roomId });
        this.state.gameRoomId = roomData.roomId;

        for (const client of this.clients) {
            const player = this.state.players.get(client.sessionId);
            client.send("game_starting", { roomId: roomData.roomId, myDisplayName: player?.displayName ?? "" });
        }
        console.log(`[LobbyRoom] Game room created: ${roomData.roomId}`);

        // Hold open briefly so all clients receive the broadcast before the room closes.
        await new Promise<void>(resolve => setTimeout(resolve, 1500));
        await this.disconnect();
    }

    private _updateMetadata(): void {
        const players = [...this.state.players.values()];
        const metadata: LobbySummary = {
            lobbyName: this.state.lobbyName,
            hostDisplayName:
                players.find(p => p.sessionId === this._hostSessionId)?.displayName ?? "",
            playerCount: players.length,
            maxPlayers: this.state.maxPlayers,
            status: this.state.status as "waiting" | "starting",
        };
        this.setMetadata(metadata);
    }
}
