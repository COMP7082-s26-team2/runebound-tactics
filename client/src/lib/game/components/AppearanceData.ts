import { AnimationState } from "@/lib/engine";

export type AppearanceData = {
    assetKey: string;           // e.g. "tilemap:entity:castle:swordsman"
    animationState: AnimationState;
    facingLeft?: boolean;       // if true, sprite is rendered horizontally flipped
    color?: string;             // fallback for debug renders when asset not loaded
};
