import {
    AnimationSequence,
    WalkStep,
} from "@/lib/engine/animation";
import { cellKey } from "@/lib/engine/world/World";
import { computeShortestPath } from "@runebound-tactics/shared";
import { STEP_DURATION_S } from "../constants";
import type { MoveEvent, SequenceDeps } from "./types";

/**
 * Builds an animation sequence that walks the entity from `ev.from` to
 * `ev.to` along the BFS shortest path, one cell at a time, at
 * STEP_DURATION_S seconds per cell. The walk row plays during motion,
 * returning to idle on completion (handled inside WalkStep).
 */
export function buildMoveSequence(
    ev: MoveEvent,
    deps: SequenceDeps,
): AnimationSequence {
    const path = computeShortestPath({
        start: ev.from,
        goal: ev.to,
        getNeighbors: (coord) => deps.world.grid.getNeighbors(coord),
        // Treat the moving unit's own start cell as free so the BFS can leave.
        // The mover's logical position has typically already been updated to
        // `ev.to` by the time this sequence is built, but be defensive.
        isOccupied: (key) => {
            if (key === cellKey(ev.from)) return false;
            return deps.world.occupancyMap.has(key) &&
                key !== cellKey(ev.to);
        },
    });

    return new AnimationSequence([
        new WalkStep(
            ev.entityId,
            path,
            STEP_DURATION_S,
            deps.tween,
            deps.anim,
            deps.world,
        ),
    ]);
}
