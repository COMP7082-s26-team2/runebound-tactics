import type { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import type { World } from "@/lib/engine/world/World";
import { cellKey } from "@/lib/engine/world/World";
import type {
    AttackEvent,
    DeathEvent,
    DiffEvents,
    LiteUnit,
    MoveEvent,
    SpawnEvent,
} from "./types";

/**
 * Compare two snapshot maps and classify the deltas as high-level events
 * (spawn / move / attack / orphan-death) suitable for sequence dispatch.
 *
 * See [[tween_sequencing_design_v1.0]] §4 for the classification rules.
 *
 * The classifier is deterministic and pure: same inputs → same output. It
 * does NOT mutate either snapshot. It DOES read live `world` state for
 * entity-id lookups (server-id → local entity-id binding).
 *
 * Edge cases:
 *   - A position change combined with an HP change on the same unit is
 *     treated as a Move (HP delta on a moving unit indicates retaliation,
 *     a future feature; not in v1 server behavior).
 *   - An ambiguous attacker (2+ adjacent units flipped hasMoved=true) falls
 *     through to orphanDeath / no attack event for that victim. Logged as
 *     gap G1 in the design.
 *   - HP-decrease without death and no attacker found: silently drops the
 *     HP change from event output (the snapshot's HP is already applied;
 *     no animation, no error).
 */
export function diffSnapshots(
    prev: Map<string, LiteUnit>,
    next: Map<string, LiteUnit>,
    world: World,
): DiffEvents {
    const events: DiffEvents = {
        spawns: [],
        moves: [],
        attacks: [],
        orphanDeaths: [],
    };

    // 1. Spawns: in next, not in prev.
    for (const [unitId, unit] of next) {
        if (!prev.has(unitId)) {
            const spawn: SpawnEvent = { unitId, unit };
            events.spawns.push(spawn);
        }
    }

    // 2. Death candidates: in prev, not in next. (Despawned units.)
    const deathCandidates: LiteUnit[] = [];
    for (const [unitId, before] of prev) {
        if (!next.has(unitId)) deathCandidates.push(before);
    }

    // 3. Per-unit position diff → MoveEvent. (HP changes handled later.)
    for (const [unitId, after] of next) {
        const before = prev.get(unitId);
        if (!before) continue;
        const positionChanged = before.x !== after.x || before.y !== after.y;
        if (!positionChanged) continue;

        const entityId = world.getEntityByServerId(unitId);
        if (entityId === undefined) continue;

        events.moves.push({
            entityId,
            from: { q: before.x, r: before.y },
            to: { q: after.x, r: after.y },
        });
    }

    // 4. Fatal attacks: each death candidate looks for an attacker, hoists
    //    them out of moves into attacks. Falls through to orphanDeath.
    for (const victimBefore of deathCandidates) {
        const attackerEntityId = findAttackerForVictim(
            prev,
            next,
            victimBefore,
            world,
        );
        if (attackerEntityId === null) {
            const victimEntityId = world.getEntityByServerId(
                victimBefore.unitId,
            );
            if (victimEntityId !== undefined) {
                events.orphanDeaths.push({ entityId: victimEntityId });
            }
            continue;
        }

        const attackerServerId = world.getServerIdByEntity(attackerEntityId);
        if (!attackerServerId) continue;

        const afterAttacker = next.get(attackerServerId);
        const beforeAttacker = prev.get(attackerServerId);
        if (!afterAttacker || !beforeAttacker) continue;

        const moved =
            beforeAttacker.x !== afterAttacker.x ||
            beforeAttacker.y !== afterAttacker.y;

        // Remove the attacker's MoveEvent (hoisted into the attack).
        removeMoveByEntityId(events.moves, attackerEntityId);

        const victimEntityId = world.getEntityByServerId(victimBefore.unitId);
        if (victimEntityId === undefined) continue;

        events.attacks.push({
            attackerId: attackerEntityId,
            targetId: victimEntityId,
            attackerFinalPos: { q: afterAttacker.x, r: afterAttacker.y },
            attackerPathFrom: moved
                ? { q: beforeAttacker.x, r: beforeAttacker.y }
                : null,
            targetPos: { q: victimBefore.x, r: victimBefore.y },
            targetWillDie: true,
            targetHpAfter: 0,
        });
    }

    // 5. Non-fatal HP decreases: target survived but took damage. Find the
    //    attacker (must have flipped hasMoved + be adjacent to target's
    //    unchanged position). HP delta with no attacker is silently dropped.
    for (const [unitId, after] of next) {
        const before = prev.get(unitId);
        if (!before) continue;
        if (after.hp >= before.hp) continue;

        // HP went down. Pos must be unchanged for a target (targets don't
        // move during attacks). If pos also changed, treat as move-only.
        const positionChanged = before.x !== after.x || before.y !== after.y;
        if (positionChanged) continue;

        const attackerEntityId = findAttackerForVictim(prev, next, after, world);
        if (attackerEntityId === null) continue;

        const attackerServerId = world.getServerIdByEntity(attackerEntityId);
        if (!attackerServerId) continue;
        const afterAttacker = next.get(attackerServerId);
        const beforeAttacker = prev.get(attackerServerId);
        if (!afterAttacker || !beforeAttacker) continue;

        const moved =
            beforeAttacker.x !== afterAttacker.x ||
            beforeAttacker.y !== afterAttacker.y;

        removeMoveByEntityId(events.moves, attackerEntityId);

        const targetEntityId = world.getEntityByServerId(unitId);
        if (targetEntityId === undefined) continue;

        events.attacks.push({
            attackerId: attackerEntityId,
            targetId: targetEntityId,
            attackerFinalPos: { q: afterAttacker.x, r: afterAttacker.y },
            attackerPathFrom: moved
                ? { q: beforeAttacker.x, r: beforeAttacker.y }
                : null,
            targetPos: { q: after.x, r: after.y },
            targetWillDie: false,
            targetHpAfter: after.hp,
        });
    }

    return events;
}

/**
 * Look for a unit whose `hasMoved` flipped false → true in this diff AND
 * whose AFTER position is adjacent to the victim. Returns the single
 * matching local entity id; null if there are zero matches or more than
 * one (ambiguous).
 */
export function findAttackerForVictim(
    prev: Map<string, LiteUnit>,
    next: Map<string, LiteUnit>,
    victim: LiteUnit,
    world: World,
): EntityId | null {
    const center = { q: victim.x, r: victim.y };
    const adjacentKeys = new Set(
        world.grid.getNeighbors(center).map((c) => cellKey(c)),
    );

    const candidates: EntityId[] = [];
    for (const [unitId, after] of next) {
        const before = prev.get(unitId);
        if (!before) continue;
        if (unitId === victim.unitId) continue;
        if (!(before.hasMoved === false && after.hasMoved === true)) continue;

        const afterKey = cellKey({ q: after.x, r: after.y });
        if (!adjacentKeys.has(afterKey)) continue;

        const entityId = world.getEntityByServerId(unitId);
        if (entityId === undefined) continue;
        candidates.push(entityId);
    }
    return candidates.length === 1 ? candidates[0]! : null;
}

function removeMoveByEntityId(moves: MoveEvent[], entityId: EntityId): void {
    const idx = moves.findIndex((m) => m.entityId === entityId);
    if (idx >= 0) moves.splice(idx, 1);
}
