import type { AnimationStep } from "@/lib/engine/animation";
import {
    AnimationSequence,
    WalkStep,
    LungeStep,
    RecoilStep,
    SetAnimationStateStep,
    ParallelStep,
} from "@/lib/engine/animation";
import { cellKey } from "@/lib/engine/world/World";
import { computeShortestPath } from "@runebound-tactics/shared";
import {
    STEP_DURATION_S,
    LUNGE_DURATION_S,
    RECOIL_DURATION_S,
    RECOIL_FRACTION,
} from "../constants";
import type { AttackEvent, SequenceDeps } from "./types";
import { buildDeathSequence } from "./buildDeathSequence";

/**
 * Builds the attacker's animation sequence for an attack event:
 *   1. Optional walk: if attacker moved this turn, walk the BFS path from
 *      attackerPathFrom → attackerFinalPos.
 *   2. Parallel lunge + attack-row: lunge 30% toward target while the
 *      attack sprite row plays for the lunge duration.
 *   3. On sequence completion: if the target dies, dispatch the target's
 *      death sequence via deps.sequencer (cross-entity callback).
 *
 * The target's HP visualization happens implicitly via reconcile (HP is
 * already in the new snapshot); future combat-feedback overlay can hook
 * into the lunge midpoint via WaitStep + callback.
 */
export function buildAttackSequence(
    ev: AttackEvent,
    deps: SequenceDeps,
): AnimationSequence {
    const steps: AnimationStep[] = [];

    if (ev.attackerPathFrom !== null) {
        const path = computeShortestPath({
            start: ev.attackerPathFrom,
            goal: ev.attackerFinalPos,
            getNeighbors: (coord) => deps.world.grid.getNeighbors(coord),
            isOccupied: (key) => {
                if (key === cellKey(ev.attackerPathFrom!)) return false;
                if (key === cellKey(ev.attackerFinalPos)) return false;
                return deps.world.occupancyMap.has(key);
            },
        });
        steps.push(
            new WalkStep(
                ev.attackerId,
                path,
                STEP_DURATION_S,
                deps.tween,
                deps.anim,
                deps.world,
            ),
        );
    }

    // Attacker lunge + attack frames in parallel with target recoil +
    // damage frames. The target's normal idle/walk anim is interrupted by
    // the "damage" state for the full lunge duration; the target tweens
    // back ~25% of a cell along the away-from-attacker vector, then
    // returns to its origin. By the time the lunge completes, the target
    // is back in position and ready for the death sequence (if any).
    steps.push(
        new ParallelStep([
            new LungeStep(
                ev.attackerId,
                ev.attackerFinalPos,
                ev.targetPos,
                LUNGE_DURATION_S,
                deps.tween,
                deps.world,
            ),
            new SetAnimationStateStep(
                ev.attackerId,
                "attack",
                LUNGE_DURATION_S,
                deps.anim,
            ),
            new RecoilStep(
                ev.targetId,
                ev.targetPos,
                ev.attackerFinalPos,
                RECOIL_DURATION_S,
                RECOIL_FRACTION,
                deps.tween,
                deps.world,
            ),
            new SetAnimationStateStep(
                ev.targetId,
                "damage",
                RECOIL_DURATION_S,
                deps.anim,
            ),
        ]),
    );

    return new AnimationSequence(steps, {
        onComplete: () => {
            if (ev.targetWillDie) {
                const deathSeq = buildDeathSequence(
                    { entityId: ev.targetId },
                    deps,
                );
                deps.sequencer.play(ev.targetId, deathSeq);
            }
        },
    });
}
