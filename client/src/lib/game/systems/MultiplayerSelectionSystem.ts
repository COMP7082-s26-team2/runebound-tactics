import { GameComponent, World, cellKey } from "@/lib/engine";
import { InputSystem } from "@/lib/game/systems/InputSystem";
import {
    computeReachableTiles,
    computeAttackableEnemies,
    computeAttackFromPositionsByEnemy,
    getAdjacentEnemies,
    createSelectionMachine,
    squareGridNeighbors,
    unitIsExhausted,
    type AttackTargetingContext,
    type SelectionMachine,
    type GridCoord,
    type GameState,
} from "@runebound-tactics/shared";
import type { Room } from "@colyseus/sdk";

/**
 * Multiplayer click-to-select / click-to-move / click-to-attack system.
 *
 * Owns a shared `selectionMachine` (idle ↔ selected ↔ awaiting-attack-target).
 * Translates canvas clicks into machine events and Colyseus messages
 * (`move_unit`, `attack_unit`).
 *
 * Turn-gated via `state.currentTurnId === room.sessionId`. Clicks on
 * opponent units or while it isn't your turn are silently dropped.
 *
 * Attack flow (v1.1 unified two-click):
 *   1. SELECT_FRIENDLY computes reachable + attackable + attackFromPositions.
 *   2. In selected state:
 *      - Click on attack-from tile (incl. attacker's own tile) → enter
 *        awaiting-attack-target with adjacent enemies as candidates.
 *      - Click on reachable non-attack tile → pure move.
 *      - Else → deselect.
 *   3. In awaiting-attack-target:
 *      - Click candidate enemy → send attack_unit with moveTo + transition idle.
 *      - Click different attack-from tile → self-loop, swap pending.
 *      - Else → cancel back to selected (or deselect if clicking elsewhere).
 *
 * Used by MultiplayerGameScene. Not interchangeable with the singleplayer
 * `SelectionSystem` — they consume different selection-state holders.
 */
export class MultiplayerSelectionSystem implements GameComponent {
    private _selection: SelectionMachine = createSelectionMachine();

    constructor(
        private _world: World,
        private _cellSize: number,
        private _input: InputSystem,
        private _room: Room<GameState>,
    ) {}

    get selectionState() {
        return this._selection.state;
    }

    get reachableTiles(): ReadonlySet<string> {
        return this._selection.context.reachableTiles;
    }

    get attackFromPositions(): ReadonlySet<string> {
        return this._selection.context.attackFromPositions;
    }

    get attackableEnemies(): ReadonlySet<string> {
        return this._selection.context.attackableEnemies;
    }

    get pendingAttackFrom(): string | null {
        return this._selection.context.pendingAttackFrom;
    }

    get pendingTargetCandidates(): ReadonlySet<string> {
        return this._selection.context.pendingTargetCandidates;
    }

    get selectedUnitId(): string | null {
        return this._selection.context.selectedUnitId;
    }

    update(_dt: number): void {
        if (!this._isMyTurn()) return;
        if (!this._input.isMouseButtonJustPressed(0)) return;

        const coord: GridCoord = {
            q: Math.floor(this._input.mouseX / this._cellSize),
            r: Math.floor(this._input.mouseY / this._cellSize),
        };
        const key = cellKey(coord);

        if (this._selection.state === "idle") {
            this._handleIdleClick(key);
            return;
        }

        if (this._selection.state === "selected") {
            this._handleSelectedClick(coord, key);
            return;
        }

        if (this._selection.state === "awaiting-attack-target") {
            this._handleAwaitingAttackTargetClick(coord, key);
            return;
        }
    }

    private _handleIdleClick(key: string): void {
        const occupant = this._world.occupancyMap.get(key);
        if (occupant === undefined) return;

        const serverId = this._world.getServerIdByEntity(occupant);
        if (!serverId || !this._isFriendly(serverId)) return;
        if (this._isExhausted(serverId)) return;

        const stats = this._world.unitStats.get(occupant);
        const start = this._world.gridPositions.get(occupant);
        if (!stats || !start) return;

        const reachable = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: (k) => this._world.occupancyMap.has(k),
            movement: stats.movement,
            start,
        });

        const attackCtx = this._buildAttackContext();
        const attackable = computeAttackableEnemies(attackCtx, serverId, reachable);
        const fromByEnemy = computeAttackFromPositionsByEnemy(
            attackCtx,
            serverId,
            reachable,
        );

        const attackFromPositions = new Set<string>();
        for (const positions of fromByEnemy.values()) {
            for (const k of positions) attackFromPositions.add(k);
        }

        this._selection.send("SELECT_FRIENDLY", {
            unitId: serverId,
            reachable,
            attackable,
            attackFromPositions,
        });
    }

    private _handleSelectedClick(coord: GridCoord, key: string): void {
        const ctx = this._selection.context;
        const serverId = ctx.selectedUnitId;
        if (!serverId) {
            this._selection.send("DESELECT");
            return;
        }

        // Click on an attack-from tile (includes attacker's own tile when
        // adjacent to enemies). Enter awaiting-attack-target.
        if (ctx.attackFromPositions.has(key)) {
            const adjacentEnemies = this._adjacentEnemyServerIdsAt(
                serverId,
                coord,
            );
            this._selection.send("ATTACK_POSITION_CHOSEN", {
                attackerId: serverId,
                from: key,
                adjacentEnemies,
            });
            return;
        }

        // Click on a reachable tile that is NOT an attack-from tile → pure move.
        if (ctx.reachableTiles.has(key)) {
            this._room.send("move_unit", {
                unitId: serverId,
                x: coord.q,
                y: coord.r,
            });
            this._selection.send("MOVE_REQUESTED", {
                unitId: serverId,
                to: coord,
            });
            return;
        }

        this._selection.send("DESELECT");
    }

    private _handleAwaitingAttackTargetClick(
        coord: GridCoord,
        key: string,
    ): void {
        const ctx = this._selection.context;
        const attackerServerId = ctx.selectedUnitId;
        const pendingFrom = ctx.pendingAttackFrom;
        if (!attackerServerId || !pendingFrom) {
            this._selection.send("DESELECT");
            return;
        }

        // Click on candidate enemy → dispatch combined attack.
        const occupant = this._world.occupancyMap.get(key);
        if (occupant !== undefined) {
            const occServerId = this._world.getServerIdByEntity(occupant);
            if (occServerId && ctx.pendingTargetCandidates.has(occServerId)) {
                const fromCoord = this._coordFromKey(pendingFrom);
                if (fromCoord) {
                    this._room.send("attack_unit", {
                        attackerId: attackerServerId,
                        targetId: occServerId,
                        moveTo: { q: fromCoord.q, r: fromCoord.r },
                    });
                }
                this._selection.send("ATTACK_TARGET_CHOSEN", {
                    attackerId: attackerServerId,
                    targetId: occServerId,
                    from: pendingFrom,
                });
                return;
            }
        }

        // Click on the SAME attack-from tile (already pending) → commit a
        // pure move there, skipping the attack. Lets the player use a green
        // tile as a movement destination after entering the picker.
        //   - If the tile is in reachableTiles → server-side movable → send move.
        //   - If the tile is the attacker's current position (NOT in
        //     reachableTiles since BFS excludes the start cell) → cancel
        //     (cannot "move" to current pos).
        if (key === pendingFrom) {
            if (ctx.reachableTiles.has(key)) {
                this._room.send("move_unit", {
                    unitId: attackerServerId,
                    x: coord.q,
                    y: coord.r,
                });
                this._selection.send("MOVE_REQUESTED", {
                    unitId: attackerServerId,
                    to: coord,
                });
            } else {
                this._selection.send("CANCEL_ATTACK");
            }
            return;
        }

        // Click on a different attack-from tile → self-loop swap.
        if (ctx.attackFromPositions.has(key) && key !== pendingFrom) {
            const adjacentEnemies = this._adjacentEnemyServerIdsAt(
                attackerServerId,
                coord,
            );
            this._selection.send("ATTACK_POSITION_CHOSEN", {
                attackerId: attackerServerId,
                from: key,
                adjacentEnemies,
            });
            return;
        }

        // Anything else → cancel back to selected.
        this._selection.send("CANCEL_ATTACK");
    }

    private _adjacentEnemyServerIdsAt(
        attackerServerId: string,
        fromCoord: GridCoord,
    ): Set<string> {
        const ctx = this._buildAttackContext();
        return getAdjacentEnemies(ctx, attackerServerId, fromCoord);
    }

    private _buildAttackContext(): AttackTargetingContext {
        return {
            getNeighbors: squareGridNeighbors,
            getOccupant: (k) => {
                const entityId = this._world.occupancyMap.get(k);
                if (entityId === undefined) return undefined;
                return this._world.getServerIdByEntity(entityId);
            },
            getOwner: (serverId) => {
                const entityId = this._world.getEntityByServerId(serverId);
                if (entityId === undefined) return undefined;
                return this._world.unitOwnership.get(entityId);
            },
            getPosition: (serverId) => {
                const entityId = this._world.getEntityByServerId(serverId);
                if (entityId === undefined) return undefined;
                return this._world.gridPositions.get(entityId);
            },
        };
    }

    private _coordFromKey(key: string): GridCoord | null {
        const [qStr, rStr] = key.split(",");
        const q = Number(qStr);
        const r = Number(rStr);
        if (Number.isNaN(q) || Number.isNaN(r)) return null;
        return { q, r };
    }

    private _isMyTurn(): boolean {
        const state = this._room.state;
        return (
            state?.phase === "active" &&
            state.currentTurnId === this._room.sessionId
        );
    }

    private _isFriendly(serverId: string): boolean {
        const unit = this._room.state?.units?.get(serverId);
        return unit?.ownerId === this._room.sessionId;
    }

    private _isExhausted(serverId: string): boolean {
        const unit = this._room.state?.units?.get(serverId);
        if (!unit) return false;
        return unitIsExhausted(unit);
    }
}
