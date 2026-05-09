import { Room, Client } from "@colyseus/core";
import { LobbyListState, LobbySummary } from "../schema/LobbyListState";

let _instance: LobbyListRoom | null = null;

interface LobbySummaryJson {
    roomId: string;
    lobbyName: string;
    playerCount: number;
    maxPlayers: number;
}

export class LobbyListRoom extends Room<{ state: LobbyListState }> {
    onCreate(): void {
        _instance = this;
        this.autoDispose = false; // keep alive even with 0 clients
        this.state = new LobbyListState();
        this.maxClients = 200;
    }

    onJoin(client: Client): void {
        // Send current list to the newly joined client
        client.send("list-state", { lobbies: LobbyListRoom._toJson() });
    }

    onLeave(_client: Client): void {}

    onDispose(): void {
        if (_instance === this) _instance = null;
    }

    static upsert(
        roomId: string,
        lobbyName: string,
        playerCount: number,
        maxPlayers: number
    ): void {
        if (!_instance) return;

        const existing = _instance.state.lobbies.get(roomId);
        if (existing) {
            existing.playerCount = playerCount;
            existing.lobbyName = lobbyName;
            existing.maxPlayers = maxPlayers;
        } else {
            const summary = new LobbySummary();
            summary.roomId = roomId;
            summary.lobbyName = lobbyName;
            summary.playerCount = playerCount;
            summary.maxPlayers = maxPlayers;
            _instance.state.lobbies.set(roomId, summary);
        }

        LobbyListRoom._broadcastList();
    }

    static remove(roomId: string): void {
        if (!_instance) return;
        _instance.state.lobbies.delete(roomId);
        LobbyListRoom._broadcastList();
    }

    private static _toJson(): LobbySummaryJson[] {
        if (!_instance) return [];
        return Array.from(_instance.state.lobbies.values()).map((l) => ({
            roomId: l.roomId,
            lobbyName: l.lobbyName,
            playerCount: l.playerCount,
            maxPlayers: l.maxPlayers,
        }));
    }

    private static _broadcastList(): void {
        if (!_instance) return;
        _instance.broadcast("list-state", { lobbies: LobbyListRoom._toJson() });
    }
}
