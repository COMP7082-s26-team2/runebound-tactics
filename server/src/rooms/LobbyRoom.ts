import { Room, Client } from "@colyseus/core";
import { LobbyState, PlayerSlot } from "../schema/LobbyState";
import { RoomRegistry, generateShortCode } from "../registry/RoomRegistry";
import { LobbyListRoom } from "./LobbyListRoom";

interface JoinOptions {
    displayName: string;
}

interface CreateOptions extends JoinOptions {
    lobbyName: string;
    maxPlayers: number;
}

interface PlayerSlotJson {
    sessionId: string;
    displayName: string;
    ready: boolean;
    slot: number;
}

interface LobbyStateJson {
    players: PlayerSlotJson[];
    lobbyName: string;
    maxPlayers: number;
    status: string;
}

export class LobbyRoom extends Room<{ state: LobbyState }> {
    onCreate(options: CreateOptions): void {
        const code = generateShortCode();
        RoomRegistry.register(code);
        this.roomId = code;

        const maxPlayers = Math.min(Math.max(options.maxPlayers ?? 4, 2), 4);
        this.maxClients = maxPlayers;
        this.state = new LobbyState();
        this.state.lobbyName = options.lobbyName ?? "Unnamed Lobby";
        this.state.maxPlayers = maxPlayers;
        this.state.status = "waiting";

        this.onMessage("ready", (client) => this._handleReady(client));
        this.onMessage("unready", (client) => this._handleUnready(client));
    }

    onJoin(client: Client, options: JoinOptions): void {
        if (this.state.status === "starting") {
            throw new Error("Match already starting.");
        }

        const slot = this._nextSlot();
        const player = new PlayerSlot();
        player.sessionId = client.sessionId;
        player.displayName = options.displayName ?? "Player";
        player.ready = false;
        player.slot = slot;

        this.state.players.set(client.sessionId, player);

        LobbyListRoom.upsert(
            this.roomId,
            this.state.lobbyName,
            this.state.players.size,
            this.state.maxPlayers
        );

        this._broadcastState();
    }

    onLeave(client: Client): void {
        this.state.players.delete(client.sessionId);

        if (this.state.players.size === 0) return;

        this.state.status = "waiting";

        LobbyListRoom.upsert(
            this.roomId,
            this.state.lobbyName,
            this.state.players.size,
            this.state.maxPlayers
        );

        this._broadcastState();
    }

    onDispose(): void {
        RoomRegistry.release(this.roomId);
        LobbyListRoom.remove(this.roomId);
    }

    private _handleReady(client: Client): void {
        if (this.state.status === "starting") return;

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        player.ready = true;

        const players = Array.from(this.state.players.values());
        const allReady = players.every((p) => p.ready);

        if (allReady && players.length >= 2) {
            this.state.status = "starting";
            this._broadcastState();
            this.broadcast("match-start", { roomId: this.roomId });
            this.lock();
            LobbyListRoom.remove(this.roomId);
        } else {
            this._broadcastState();
        }
    }

    private _handleUnready(client: Client): void {
        if (this.state.status === "starting") return;

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        player.ready = false;
        this._broadcastState();
    }

    private _broadcastState(): void {
        const payload: LobbyStateJson = {
            players: Array.from(this.state.players.values()).map((p) => ({
                sessionId: p.sessionId,
                displayName: p.displayName,
                ready: p.ready,
                slot: p.slot,
            })),
            lobbyName: this.state.lobbyName,
            maxPlayers: this.state.maxPlayers,
            status: this.state.status,
        };
        this.broadcast("lobby-state", payload);
    }

    private _nextSlot(): number {
        const used = new Set(
            Array.from(this.state.players.values()).map((p) => p.slot)
        );
        for (let i = 1; i <= this.state.maxPlayers; i++) {
            if (!used.has(i)) return i;
        }
        return this.state.players.size + 1;
    }
}
