// shared/src/schemas/Player.ts
import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
    @type("string") sessionId: string = "";
    @type("string") name: string = "";
    @type("int32") hp: number = 100;
    @type("boolean") isReady: boolean = false;
}
