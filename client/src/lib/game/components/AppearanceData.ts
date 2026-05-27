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
};
