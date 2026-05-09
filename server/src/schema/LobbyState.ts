import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerSlot extends Schema {
    @type("string") sessionId: string = "";
    @type("string") displayName: string = "";
    @type("boolean") ready: boolean = false;
    @type("number") slot: number = 0;
}

export class LobbyState extends Schema {
    @type({ map: PlayerSlot }) players = new MapSchema<PlayerSlot>();
    @type("string") lobbyName: string = "";
    @type("number") maxPlayers: number = 4;
    @type("string") status: string = "waiting";
}
