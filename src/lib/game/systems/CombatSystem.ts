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
        targetId: EntityId,
    ): AttackResult | null {
        const attacker = this._world.unitStats.get(attackerId)
        const defender = this._world.unitStats.get(targetId)

        if (!attacker) {
            throw new Error(`[CombatSystem.resolveAttack] Attacker ${attackerId} does not exist in world`)
        }

        if (!defender) {
            throw new Error(`[CombatSystem.resolveAttack] Target unit ${targetId} does not exist in world`)
        }
        
        const damage = Math.max(0, attacker.attack - defender.defense)
        
        return {
            damage,
            defenderDied: defender.health - damage <= 0,
            newDefenderHp: Math.max(0, defender.health - damage)
        }
    }
    
    applyAttackResult(
        result: AttackResult,
        // NOTE: _attackerId is unused but kept for future counter-attack feature implementation
        _attackerId: EntityId,
        targetId: EntityId,
    ): void {
        const defender = this._world.unitStats.get(targetId)
        
        if (!defender) {
            throw new Error(`[CombatSystem.applyAttackResult] Target unit ${targetId} does not exist in world`)
        }

        // TESTING
        console.log(`[CombatSystem.applyAttackResult] ${defender.name} HP: ${defender.health} -> ${result.newDefenderHp}`);
        
        // NOTE: commented out unit removal logic because it should be left to the post-combat phase
        // if (result.defenderDied) {
        //     this._world.removeUnit(targetId)
        // } else {
            this._world.unitStats.set(targetId, {
                ...defender,
                health: result.newDefenderHp
            })
        // }
    }

    computeAttackable(entityId: EntityId): Set<EntityId> {
        const stats = this._world.unitStats.get(entityId)
        const pos = this._world.gridPositions.get(entityId)

        const attackableEntities = new Set<EntityId>()

        if (!stats || !pos) {
            console.warn(`[CombatSystem.computeAttackable] Could not retrieve stats or position for entity ${entityId}`);
            return attackableEntities;
        }

        for (const [candidateId] of this._world.unitStats.entries()) {
            if (candidateId === entityId) continue;

            const candidatePos = this._world.gridPositions.get(candidateId)

            if (!candidatePos) continue;

            if (this._world.grid.distance(pos, candidatePos) <= stats.attackRange) {
                attackableEntities.add(candidateId)
            }
        }

        return attackableEntities
    }
}

export { CombatSystem, type AttackResult };
