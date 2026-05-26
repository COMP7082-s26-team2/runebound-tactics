/**
 * Tween-sequencing animation timing constants.
 *
 * See [[tween_sequencing_design_v1.0]] §3 for rationale.
 * Tunable; centralizing here so feel adjustments live in one file.
 */

/** Seconds per cell during walk animations. ~0.35s gives a clearly readable step. */
export const STEP_DURATION_S = 0.35;

/** Total seconds for a lunge attack (going + returning). */
export const LUNGE_DURATION_S = 0.7;

/** Seconds for a target's recoil reaction (push back + return). Matches lunge so both halves align. */
export const RECOIL_DURATION_S = 0.7;

/** Fraction of a cell the target is pushed back during recoil. */
export const RECOIL_FRACTION = 0.25;

/** Seconds for death sprite-row playback (4 frames × DEFAULT_FRAME_DURATION + a small read-time pad). */
export const DEATH_ANIM_DURATION_S = 0.9;

/** Seconds for fade+shrink death fallback when no death sprite row exists. */
export const DEATH_FALLBACK_DURATION_S = 0.5;
