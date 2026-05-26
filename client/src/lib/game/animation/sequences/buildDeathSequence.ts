import type { AnimationStep } from "@/lib/engine/animation";
import {
    AnimationSequence,
    SetAnimationStateStep,
    FadeStep,
    DespawnStep,
} from "@/lib/engine/animation";
import {
    DEATH_ANIM_DURATION_S,
    DEATH_FALLBACK_DURATION_S,
} from "../constants";
import type { DeathEvent, SequenceDeps } from "./types";

/**
 * Builds a death animation sequence:
 *   - If the unit's sprite sheet has a "death" row, play it once for
 *     DEATH_ANIM_DURATION_S.
 *   - Otherwise, fade alpha 1→0 and scale 1→0.5 over
 *     DEATH_FALLBACK_DURATION_S.
 *   - In both cases, finish with DespawnStep (removes the entity from the
 *     world).
 *
 * Marked `terminal` — the sequencer refuses to override it; the unit is
 * already gone server-side and the animation must run to completion.
 */
export function buildDeathSequence(
    ev: DeathEvent,
    deps: SequenceDeps,
): AnimationSequence {
    const appearance = deps.world.unitAppearance.get(ev.entityId);
    const sheet = appearance
        ? deps.assets.getSpriteSheet(appearance.assetKey)
        : undefined;
    const hasDeathRow = sheet?.rowMap["death"] !== undefined;

    const steps: AnimationStep[] = [];

    if (hasDeathRow) {
        steps.push(
            new SetAnimationStateStep(
                ev.entityId,
                "death",
                DEATH_ANIM_DURATION_S,
                deps.anim,
                deps.world,
            ),
        );
    } else {
        steps.push(
            new FadeStep(
                ev.entityId,
                {
                    from: { alpha: 1, scale: 1 },
                    to: { alpha: 0, scale: 0.5 },
                    duration: DEATH_FALLBACK_DURATION_S,
                },
                deps.world,
            ),
        );
    }

    steps.push(new DespawnStep(ev.entityId, deps.world, deps.anim));

    return new AnimationSequence(steps, { terminal: true });
}
