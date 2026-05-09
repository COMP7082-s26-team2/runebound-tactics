import { Client } from "@colyseus/sdk";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRoom = ReturnType<Client["create"]> extends Promise<infer R> ? R : never;

const DEFAULT_URL = "ws://localhost:2567";

export class ColyseusTransport {
    private static _instance: ColyseusTransport | null = null;
    private _client: Client;

    private constructor() {
        const url =
            process.env.NEXT_PUBLIC_COLYSEUS_URL ?? DEFAULT_URL;
        this._client = new Client(url);
    }

    static getInstance(): ColyseusTransport {
        if (!this._instance) {
            this._instance = new ColyseusTransport();
        }
        return this._instance;
    }

    async create(roomName: string, options?: object): Promise<AnyRoom> {
        return this._client.create(roomName, options);
    }

    async joinById(roomId: string, options?: object): Promise<AnyRoom> {
        return this._client.joinById(roomId, options);
    }

    async join(roomName: string, options?: object): Promise<AnyRoom> {
        return this._client.join(roomName, options);
    }

    async joinOrCreate(roomName: string, options?: object): Promise<AnyRoom> {
        return this._client.joinOrCreate(roomName, options);
    }
}
