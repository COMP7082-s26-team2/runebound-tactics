/**
 * Plain TypeScript types for game constants, enums, and non-synced shapes.
 * These are compile-time constraints used at system boundaries.
 * Do NOT use @type decorators here — this file has no Colyseus dependency.
 */

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

export type Faction = "castle" | "necropolis";

// ---------------------------------------------------------------------------
// Unit rosters (must match tilemap asset folder names under public/assets/tilemaps/entities/)
// ---------------------------------------------------------------------------

export type CastleUnit =
    | "angel"
    | "archer"
    | "cavalier"
    | "griffin"
    | "monk"
    | "paladin"
    | "peasant"
    | "pikeman"
    | "swordsman";

export type NecropolisUnit =
    | "death_knight"
    | "ghost"
    | "lich"
    | "skeleton"
    | "spider"
    | "vampire"
    | "zombie";

export type UnitType = CastleUnit | NecropolisUnit;

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

/**
 * Tile terrain types.
 * Defense bonuses and movement costs are server-side constants — not synced state.
 */
export type TileType =
    | "plains"    // no modifier
    | "forest"    // +1 def, -1 move (non-cavalry)
    | "mountain"  // +2 def, impassable for cavalry
    | "road"      // +1 move
    | "base"      // +2 def, capturable
    | "city"      // +1 def, capturable, provides gold income
    | "hq"        // +3 def, capturable, loss condition
    | "water";    // impassable for most units

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------

/** Top-level game lifecycle phase. */
export type GamePhase = "setup" | "active" | "ended";

// ---------------------------------------------------------------------------
// Shared value objects
// ---------------------------------------------------------------------------

/** A grid cell position. */
export interface TilePosition {
    x: number;
    y: number;
}
