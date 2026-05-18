import { EntityId, World } from "@/lib/engine";

type AttackResult = {
    damage: number;
    defenderDied: boolean;
    newDefenderHp: number;
};

class CombatSystem {
    constructor(private readonly _world: World) {}

    resolveAttack(
        attackerId: EntityId,
        targetid: EntityId,
    ): AttackResult | null {}

    applyAttackResult(
        result: AttackResult,
        _attackerId: EntityId,
        targetId: EntityId,
    ): void {}

    computeAttackable(entityId: EntityId): Set<EntityId> {}
}

export { CombatSystem, type AttackResult };
