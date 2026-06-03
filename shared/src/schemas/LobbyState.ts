import { MapSchema, Schema, type } from "@colyseus/schema";

/**
 * Represents a single player occupying a slot in the lobby waiting room.
 * Synchronized in real-time via Colyseus MapSchema.
 */
export class LobbyPlayerSlot extends Schema {
    /** Colyseus session ID — set by server on join. */
    @type("string") sessionId: string = "";

    /** Display name chosen by the player. */
    @type("string") displayName: string = "";

    /** Whether the player has clicked Ready. */
    @type("boolean") isReady: boolean = false;

    /** Slot index 1–4. */
    @type("int8") slot: number = 0;

    /** Chosen faction string ("castle" | "necropolis"). */
    @type("string") faction: string = "";
}

/**
 * Root state for a LobbyRoom — synchronized to all connected clients.
 */
export class LobbyState extends Schema {
    /** All connected players keyed by sessionId. */
    @type({ map: LobbyPlayerSlot }) players = new MapSchema<LobbyPlayerSlot>();

    /** Human-readable lobby name shown in the room list. */
    @type("string") lobbyName: string = "";

    /** Maximum number of players (2–4). */
    @type("int8") maxPlayers: number = 2;

    /**
     * Lobby lifecycle status.
     * - "waiting"      — accepting players
     * - "starting"     — all players ready; countdown in progress
     * - "transferring" — game room created; clients should connect to gameRoomId
     */
    @type("string") status: string = "waiting";

    /**
     * Colyseus room ID of the created GameRoom.
     * Set by the server when status transitions to "transferring".
     * Allows reconnecting clients to discover the game room without the "game_starting" message.
     */
    @type("string") gameRoomId: string = "";
}
