import { ColyseusTransport } from "./network/ColyseusTransport";

export interface LobbySummary {
    roomId: string;
    lobbyName: string;
    playerCount: number;
    maxPlayers: number;
}

type ListChangeCallback = (lobbies: LobbySummary[]) => void;

export class LobbyListService {
    private static _instance: LobbyListService | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _room: any = null;
    private _transport = ColyseusTransport.getInstance();
    private _callbacks = new Set<ListChangeCallback>();
    private _latestLobbies: LobbySummary[] | null = null;

    static getInstance(): LobbyListService {
        if (!this._instance) this._instance = new LobbyListService();
        return this._instance;
    }

    async connect(): Promise<void> {
        if (this._room) return;
        this._room = await this._transport.joinOrCreate("lobby-list");
        // Register handler immediately after connection so we don't miss
        // the initial list-state sent by the server during onJoin.
        this._room.onMessage(
            "list-state",
            ({ lobbies }: { lobbies: LobbySummary[] }) => {
                this._latestLobbies = lobbies;
                this._callbacks.forEach((cb) => cb(lobbies));
            }
        );
    }

    disconnect(): void {
        this._room?.leave();
        this._room = null;
        this._latestLobbies = null;
        this._callbacks.clear();
    }

    onListChange(cb: ListChangeCallback): () => void {
        this._callbacks.add(cb);
        // Replay the most recent list immediately if we already received it
        if (this._latestLobbies !== null) {
            cb(this._latestLobbies);
        }
        return () => this._callbacks.delete(cb);
    }
}
