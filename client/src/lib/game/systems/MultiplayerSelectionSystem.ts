import type { Room } from "@colyseus/sdk";
import { EntityId, GridCoord, TweenManager, World, cellKey, Vector2D } from "@/lib/engine";
import { ClientGameState, TurnFlow } from "@/lib/game/state";
import { CombatSystem } from "@/lib/game/systems/CombatSystem";
import { InputSystem } from "@/lib/game/systems/InputSystem";
import { SelectionSystem } from "@/lib/game/systems/SelectionSystem";
import { computePath } from "@/lib/game/utils";

export class MultiplayerSelectionSystem extends SelectionSystem {
    constructor(
        world: World,
        cellSize: number,
        state: ClientGameState,
        input: InputSystem,
        tweens: TweenManager,
        combat: CombatSystem,
        turnFlow: TurnFlow,
        private _room: Room,
        private _entityIdToUnitId: Map<EntityId, string>,
        private _mySessionId: string,
        stepDuration?: number,
    ) {
        super(world, cellSize, state, input, tweens, combat, turnFlow, stepDuration);
    }

    override update(dt: number): void {
        if (this._state.activePlayerId !== this._mySessionId) {
            this._handleNonTurnClick();
            return;
        }
        super.update(dt);
    }

    private _handleNonTurnClick(): void {
        if (!this._input.isMouseButtonJustPressed(0)) return;
        const coord = {
            q: Math.floor(this._input.mouseX / this._cellSize),
            r: Math.floor(this._input.mouseY / this._cellSize),
        };
        const occupant = this._world.occupancyMap.get(cellKey(coord)) ?? null;
        if (occupant !== null) {
            this._onInspect(occupant);
        }
    }

    private _onInspect(_entityId: EntityId): void {
        // Stub — stat viewing deferred
    }

    protected override _moveUnit(entityId: EntityId, targetCoord: GridCoord): void {
        const unitId = this._entityIdToUnitId.get(entityId);
        if (!unitId) return;

        // Optimistic local ECS update — mirrors base class _moveUnit
        // Ensures computeAttackable after this call uses the new position
        const path = computePath(this._world, entityId, targetCoord);
        const oldCoord = this._world.gridPositions.get(entityId)!;
        const currentVisualPos = this._tweens.getPosition(
            entityId,
            this._world.grid.gridToWorld(oldCoord),
        );
        this._world.moveUnit(entityId, targetCoord);
        const waypoints: Vector2D[] = [
            currentVisualPos,
            ...path.slice(1).map((c) => this._world.grid.gridToWorld(c)),
        ];
        this._tweens.startPath(entityId, waypoints, this._stepDuration);

        this._room.send("move_unit", { unitId, x: targetCoord.q, y: targetCoord.r });
    }

    protected override _declareAttack(attackerId: EntityId, targetId: EntityId): void {
        const attackerUnitId = this._entityIdToUnitId.get(attackerId);
        const targetUnitId = this._entityIdToUnitId.get(targetId);
        if (!attackerUnitId || !targetUnitId) return;
        this._room.send("attack_unit", { attackerId: attackerUnitId, targetId: targetUnitId });
    }
}
