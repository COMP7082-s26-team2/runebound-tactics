import { MapSchema, Schema, type } from "@colyseus/schema";

/**
 * A single unit on the game grid.
 * Synchronized in real-time. Static stats (attack, move range) are server-side constants.
 */
export class GameUnit extends Schema {
    /** Unique unit ID (e.g. `${ownerId}:${index}`). */
    @type("string") unitId: string = "";

    /** sessionId of the controlling player. */
    @type("string") ownerId: string = "";

    /** Unit type string — must match a UnitType value from types/game.ts. */
    @type("string") unitType: string = "";

    /** Grid column. */
    @type("int16") x: number = 0;

    /** Grid row. */
    @type("int16") y: number = 0;

    /** Current hit points. */
    @type("int32") hp: number = 0;

    /** Maximum hit points. */
    @type("int32") maxHp: number = 0;

    /**
     * Whether this unit has used its action (attack/ability) this turn.
     * Reset to false at the start of the owning player's turn.
     */
    @type("boolean") hasActed: boolean = false;

    /**
     * Whether this unit has moved this turn.
     * Separated from hasActed to allow move-then-attack or attack-in-place patterns.
     * Reset to false at the start of the owning player's turn.
     */
    @type("boolean") hasMoved: boolean = false;
}

/**
 * A player participating in an active game session.
 */
export class GamePlayerSlot extends Schema {
    /** Colyseus connection/session ID used by the current room state maps. */
    @type("string") sessionId: string = "";

    /** Verified app player ID from player.player_id; stable across reconnects. */
    @type("string") userId: string = "";

    /** Display name from the verified player profile. */
    @type("string") displayName: string = "";

    /** Chosen faction string ("castle" | "necropolis"). */
    @type("string") faction: string = "";

    /** Current gold. Increased by city income at the start of each player's turn. */
    @type("int32") gold: number = 0;

    /**
     * Whether this player has been eliminated.
     * True when their HQ is captured or all units are destroyed.
     */
    @type("boolean") isEliminated: boolean = false;
}

/**
 * Root state for a GameRoom — synchronized to all connected clients.
 * Terrain/map data is NOT included here; the client loads it from the tilemap asset.
 */
export class GameState extends Schema {
    /** All players keyed by sessionId. */
    @type({ map: GamePlayerSlot }) players = new MapSchema<GamePlayerSlot>();

    /** All units on the board keyed by unitId. */
    @type({ map: GameUnit }) units = new MapSchema<GameUnit>();

    /** sessionId of the player whose turn it currently is. */
    @type("string") currentTurnId: string = "";

    /** Increments each time a full round completes (all players have taken a turn). */
    @type("int16") turnNumber: number = 0;

    /**
     * Top-level game lifecycle phase.
     * - "setup"  — pre-game; players selecting factions / confirming positions
     * - "active" — game in progress
     * - "ended"  — game over; winnerId is set
     */
    @type("string") phase: string = "setup";

    /** sessionId of the winner. Empty string until the game ends. */
    @type("string") winnerId: string = "";

    /**
     * Map/scenario identifier used by the client to load the correct tilemap asset.
     * e.g. "two_player_grasslands"
     */
    @type("string") mapId: string = "";

    /**
     * Current within-turn resolution phase, mirroring TurnMachine state.
     * Values: "action-phase" | "declare-end-turn" | "quick-play" | "combat" | "post-combat"
     * Written exclusively by the GameRoom TurnMachine subscriber.
     */
    @type("string") turnPhase: string = "action-phase";
}
