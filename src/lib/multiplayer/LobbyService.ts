import { Room } from "@colyseus/sdk";
import { ColyseusTransport } from "./network/ColyseusTransport";

export interface PlayerSlot {
    sessionId: string;
    displayName: string;
    ready: boolean;
    slot: number;
}

export interface LobbyState {
    players: PlayerSlot[];
    lobbyName: string;
    maxPlayers: number;
    status: string;
}

type StateChangeCallback = (state: LobbyState) => void;
type MatchStartCallback = (data: { roomId: string }) => void;

export class LobbyService {
    private static _instance: LobbyService | null = null;

    private _room: Room | null = null;
    private _transport = ColyseusTransport.getInstance();

    static getInstance(): LobbyService {
        if (!this._instance) this._instance = new LobbyService();
        return this._instance;
    }

    get sessionId(): string | null {
        return this._room?.sessionId ?? null;
    }

    get roomId(): string | null {
        return this._room?.roomId ?? null;
    }

    async createRoom(
        displayName: string,
        lobbyName: string,
        maxPlayers: 2 | 3 | 4
    ): Promise<string> {
        this._room = await this._transport.create("lobby", {
            displayName,
            lobbyName,
            maxPlayers,
        });
        return this._room.roomId;
    }

    async joinRoom(code: string, displayName: string): Promise<void> {
        this._room = await this._transport.joinById(code.toUpperCase(), {
            displayName,
        });
    }

    setReady(): void {
        this._room?.send("ready");
    }

    setUnready(): void {
        this._room?.send("unready");
    }

    leave(): void {
        this._room?.leave();
        this._room = null;
    }

    onStateChange(cb: StateChangeCallback): () => void {
        if (!this._room) return () => {};
        this._room.onMessage("lobby-state", (state: LobbyState) => cb(state));
        return () => {};
    }

    onMatchStart(cb: MatchStartCallback): void {
        this._room?.onMessage("match-start", cb);
    }
}
