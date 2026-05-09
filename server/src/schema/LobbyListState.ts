import { Schema, type, MapSchema } from "@colyseus/schema";

export class LobbySummary extends Schema {
    @type("string") roomId: string = "";
    @type("string") lobbyName: string = "";
    @type("number") playerCount: number = 0;
    @type("number") maxPlayers: number = 4;
}

export class LobbyListState extends Schema {
    @type({ map: LobbySummary }) lobbies = new MapSchema<LobbySummary>();
}
