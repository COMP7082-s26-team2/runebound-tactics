import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

export class TestPlayer extends Schema {
    @type("string") displayName: string = "";
}

export class ChatMessage extends Schema {
    @type("string") sender: string = "";
    @type("string") text: string = "";
    @type("number") timestamp: number = 0;
}

export class TestRoomState extends Schema {
    @type({ map: TestPlayer }) players = new MapSchema<TestPlayer>();
    @type([ChatMessage]) messages = new ArraySchema<ChatMessage>();
}
