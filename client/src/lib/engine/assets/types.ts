export type AnimationState =
    | "idle"
    | "walk"
    | "attack"
    | "damage"
    | "death"
    | "special";

export interface SpriteSheetDefinition {
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    rowMap: Partial<Record<AnimationState, number>>;
    pixelPerfect?: boolean; // disable image smoothing for crisp pixel art rendering
}

export type AssetType = "tilemap";

export interface AssetDescriptor {
    type: AssetType;
    src: string;
    spriteSheet?: SpriteSheetDefinition;
}

export type AssetManifest = Record<string, AssetDescriptor>;
