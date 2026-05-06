import { AssetManifest } from "@/lib/engine";

/**
 * Game-specific asset manifest.
 * Maps asset keys to file paths and sprite sheet definitions.
 * All paths are relative to the public/ directory.
 * Uses sprite_sheet_<unit>_0_16x16.png as the primary sprite sheets (variant 0).
 * pixelPerfect: true disables image smoothing for crisp pixel art rendering.
 */
export const ASSET_MANIFEST: AssetManifest = {
    // Castle faction
    "tilemap:entity:castle:angel": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/castle/angel/sprite_sheet_angel_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4, special: 5 },
        },
    },
    "tilemap:entity:castle:archer": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/castle/archer/sprite_sheet_archer_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4 },
        },
    },
    "tilemap:entity:castle:cavalier": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/castle/cavalier/sprite_sheet_cavalier_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4 },
        },
    },
    "tilemap:entity:castle:griffin": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/castle/griffin/sprite_sheet_griffin_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4 },
        },
    },
    "tilemap:entity:castle:monk": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/castle/monk/sprite_sheet_monk_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4 },
        },
    },
    "tilemap:entity:castle:paladin": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/castle/paladin/sprite_sheet_paladin_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4, special: 5 },
        },
    },
    "tilemap:entity:castle:peasant": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/castle/peasant/sprite_sheet_peasant_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4 },
        },
    },
    "tilemap:entity:castle:pikeman": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/castle/pikeman/sprite_sheet_pikeman_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4 },
        },
    },
    "tilemap:entity:castle:swordsman": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/castle/swordsman/sprite_sheet_swordsman_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4, special: 5 },
        },
    },

    // Necropolis faction
    "tilemap:entity:necropolis:death_knight": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/necropolis/death_knight/sprite_sheet_death_knight_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4, special: 5 },
        },
    },
    "tilemap:entity:necropolis:ghost": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/necropolis/ghost/sprite_sheet_ghost_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4 },
        },
    },
    "tilemap:entity:necropolis:lich": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/necropolis/lich/sprite_sheet_lich_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4, special: 5 },
        },
    },
    "tilemap:entity:necropolis:skeleton": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/necropolis/skeleton/sprite_sheet_skeleton_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4 },
        },
    },
    "tilemap:entity:necropolis:spider": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/necropolis/spider/sprite_sheet_spider_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4 },
        },
    },
    "tilemap:entity:necropolis:vampire": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/necropolis/vampire/sprite_sheet_vampire_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4, special: 5 },
        },
    },
    "tilemap:entity:necropolis:zombie": {
        type: "tilemap",
        src: "/assets/tilemaps/entities/necropolis/zombie/sprite_sheet_zombie_0_16x16.png",
        spriteSheet: {
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            pixelPerfect: true,
            rowMap: { idle: 0, walk: 1, attack: 2, damage: 3, death: 4 },
        },
    },
};
