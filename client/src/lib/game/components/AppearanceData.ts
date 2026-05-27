import { AnimationState } from "@/lib/engine";

export type AppearanceData = {
    assetKey: string;           // e.g. "tilemap:entity:castle:swordsman"
    animationState: AnimationState;
    facingLeft?: boolean;       // if true, sprite is rendered horizontally flipped
    color?: string;             // fallback for debug renders when asset not loaded

    /**
     * If true, the unit is rendered with a grayed/desaturated treatment to
     * signal it has consumed its movement allowance this turn.
     *
     * Set by MultiplayerGameScene.reconcile based on the shared
     * unitIsExhausted predicate AND ownerId === room.sessionId. Opponent
     * exhausted units are NOT marked — player-centric rule per
     * unit_visual_states_design_v1.0.
     */
    exhausted?: boolean;

    /**
     * Render-time opacity multiplier applied inside UnitRenderSystem's
     * per-unit save/restore. Defaults to 1 (fully opaque). Used by
     * FadeStep for the death fade-and-shrink fallback animation.
     * See tween_sequencing_design_v1.0 §8.
     */
    alpha?: number;

    /**
     * Render-time scale multiplier applied around the cell center.
     * Defaults to 1 (no scaling). Used by FadeStep for the death
     * fade-and-shrink fallback animation.
     */
    scale?: number;
};
