import { AnimationState } from "@/lib/engine";

export const ANIMATION_FRAME_DURATIONS: Partial<Record<AnimationState, number>> = {
    idle: 0.20,
    walk: 0.20,
};

export const DEFAULT_FRAME_DURATION = 0.15;
