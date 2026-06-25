import type { AnimationStep } from "@/lib/engine/animation";
import {
    AnimationSequence,
    CallbackStep,
    WalkStep,
    LungeStep,
    RecoilStep,
    SetAnimationStateStep,
    ParallelStep,
    SerialStep,
    WaitStep,
} from "@/lib/engine/animation";
import { cellKey } from "@/lib/engine/world/World";
import {
    computeShortestPath,
    canEnter,
    getUnitMovementType,
} from "@runebound-tactics/shared";
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
        const unitType = deps.world.unitTypes.get(ev.attackerId) ?? "";
        const movementType = getUnitMovementType(unitType);

        const path = computeShortestPath({
            start: ev.attackerPathFrom,
            goal: ev.attackerFinalPos,
            getNeighbors: (coord) => deps.world.grid.getNeighbors(coord),
            isOccupied: (key) => {
                if (key === cellKey(ev.attackerPathFrom!)) return false;
                if (key === cellKey(ev.attackerFinalPos)) return false;
                return deps.world.occupancyMap.has(key);
            },
            canEnter: (coord) =>
                canEnter({ movementType }, deps.terrainLayer.at(coord)),
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

    // Attacker timing over LUNGE_DURATION_S = T:
    //   t=0    → T/2 (windup → impact):  attack frames play
    //   t=T/2                          :  IMPACT — attack loop ends at the
    //                                     tip; SetAnimationStateStep cleanup
    //                                     restores priorState (idle)
    //   t=T/2  → T   (recovery):        idle frames play while attacker
    //                                     tweens back to origin
    //
    // Target reaction also fires at impact (mid-lunge) and runs through the
    // attacker's recovery half. Both attacker and target are back in their
    // resting state at t=T.
    const impactDelay = LUNGE_DURATION_S / 2;

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
                impactDelay + 0.7,
                deps.anim,
                deps.world,
            ),
            new SerialStep([
                new WaitStep(impactDelay),
                ...(ev.onImpact ? [new CallbackStep(ev.onImpact)] : []),
                new ParallelStep([
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
                        deps.world,
                    ),
                ]),
            ]),
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
