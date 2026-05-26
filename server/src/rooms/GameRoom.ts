import { Room, Client } from "colyseus";
import {
    GamePlayerSlot,
    GameState,
    GameUnit,
    cellKey,
    computeReachableTiles,
    computeAttackDamage,
    getUnitMovement,
    squareGridNeighbors,
    unitIsExhausted,
    GRID_ROWS,
} from "@runebound-tactics/shared";
import type { Faction, GridCoord } from "@runebound-tactics/shared";
import { pendingGames } from "./pendingGames";

interface PendingPlayer {
    displayName: string;
    faction: string;
}

interface GameRoomOptions {
    lobbyRoomId: string;
}

interface JoinOptions {
    displayName?: string;
}

interface MoveUnitPayload {
    unitId: string;
    x: number;
    y: number;
}

interface AttackUnitPayload {
    attackerId: string;
    targetId: string;
    /**
     * Optional pre-attack movement to an attack-from tile.
     * - Undefined OR equal to attacker's current position = zero-move attack.
     * - Different from current position = combined move+attack (atomic).
     */
    moveTo?: { q: number; r: number };
}

export class GameRoom extends Room<{ state: GameState }> {
    /** Players expected to join, keyed by displayName. Set in onCreate. */
    private _pendingPlayers = new Map<string, PendingPlayer>();
    /** Ordered turn list — session IDs in the order players joined. */
    private _turnOrder: string[] = [];
    /**
     * Reachability cache for the CURRENT active player's units.
     * Map<unitId, Set<cellKey>>. Rebuilt on turn start and on every move.
     * O(1) lookup for move_unit validation.
     */
    private _reachabilityCache = new Map<string, Set<string>>();

    onCreate(options: GameRoomOptions): void {
        const pending = pendingGames.get(options.lobbyRoomId);
        if (!pending) {
            throw new Error(
                `[GameRoom] No pending data for lobbyRoomId="${options.lobbyRoomId}". Direct joins are not permitted.`
            );
        }
        pendingGames.delete(options.lobbyRoomId);

        this.setState(new GameState());
        this.maxClients = pending.players.length;

        for (const p of pending.players) {
            this._pendingPlayers.set(p.displayName, p);
        }

        this.onMessage<MoveUnitPayload>("move_unit", (client, payload) => {
            if (!this._isCurrentTurn(client)) return;

            const unit = this.state.units.get(payload?.unitId);
            if (!unit || unit.ownerId !== client.sessionId) return;
            if (unit.hasMoved) return;

            const destKey = cellKey({ q: payload.x, r: payload.y });
            const reachable = this._reachabilityCache.get(unit.unitId);
            if (!reachable || !reachable.has(destKey)) return;

            const prevPos: GridCoord = { q: unit.x, r: unit.y };
            unit.x = payload.x;
            unit.y = payload.y;
            unit.hasMoved = true;

            this._updateReachabilityAfterMove(unit.unitId, prevPos, {
                q: payload.x,
                r: payload.y,
            });
        });

        this.onMessage<AttackUnitPayload>("attack_unit", (client, payload) => {
            this._handleAttack(client.sessionId, payload);
        });

        this.onMessage("end_turn", (client) => {
            if (!this._isCurrentTurn(client)) return;
            this._advanceTurn();
        });
    }

    onJoin(client: Client, options?: JoinOptions): void {
        const displayName = String(options?.displayName ?? "Player").slice(0, 32);
        const pending = this._pendingPlayers.get(displayName);

        const slot = new GamePlayerSlot();
        slot.sessionId = client.sessionId;
        slot.displayName = displayName;
        slot.faction = (pending?.faction ?? "") as Faction;
        this.state.players.set(client.sessionId, slot);

        this._pendingPlayers.delete(displayName);
        this._turnOrder.push(client.sessionId);

        console.log(`[GameRoom] ${displayName} joined (${client.sessionId})`);

        if (this._allPlayersJoined()) {
            this._startGame();
        }
    }

    async onDrop(client: Client, code?: number): Promise<void> {
        try {
            await this.allowReconnection(client, 30);
            console.log(`[GameRoom] ${client.sessionId} reconnected`);
        } catch {
            console.log(`[GameRoom] ${client.sessionId} reconnect window expired (code ${code})`);
            this._eliminatePlayer(client.sessionId);
        }
    }

    onLeave(client: Client): void {
        this._eliminatePlayer(client.sessionId);
    }

    private _eliminatePlayer(sessionId: string): void {
        const player = this.state.players.get(sessionId);
        if (player) {
            player.isEliminated = true;
            console.log(`[GameRoom] ${player.displayName} eliminated`);
        }
        if (this.state.currentTurnId === sessionId) {
            this._advanceTurn();
        }
        this._checkWinCondition();
    }

    private _allPlayersJoined(): boolean {
        return this._pendingPlayers.size === 0;
    }

    private _startGame(): void {
        this.state.phase = "active";
        this.state.currentTurnId = this._turnOrder[0] ?? "";

        this._spawnInitialUnits();
        this._rebuildReachabilityCache(this.state.currentTurnId);

        console.log(
            `[GameRoom] Game started. First turn: ${this.state.currentTurnId}. Units: ${this.state.units.size}`,
        );
    }

    /**
     * Minimal unit spawn — 2 units per player at fixed positions.
     * First player (index 0) spawns at row 1; second at row GRID_ROWS-2.
     *
     * Replace with the full faction-based spawn config when the combat
     * sprint lands (see engine_multiplayer_rework_design_v1.0 §2.1).
     */
    private _spawnInitialUnits(): void {
        for (let i = 0; i < this._turnOrder.length; i++) {
            const sessionId = this._turnOrder[i];
            const slot = this.state.players.get(sessionId);
            if (!slot) continue;

            const isFirst = i === 0;
            const row = isFirst ? 1 : GRID_ROWS - 2;
            const faction: Faction =
                slot.faction === "necropolis" ? "necropolis" : "castle";

            const unitTypes =
                faction === "necropolis"
                    ? ["necropolis:skeleton", "necropolis:death_knight"]
                    : ["castle:swordsman", "castle:archer"];

            for (let j = 0; j < unitTypes.length; j++) {
                const unit = new GameUnit();
                unit.unitId = `${sessionId}:u${j + 1}`;
                unit.ownerId = sessionId;
                unit.unitType = unitTypes[j]!;
                unit.x = 2 + j * 2;
                unit.y = row;
                unit.hp = 30;
                unit.maxHp = 30;
                unit.hasMoved = false;
                unit.hasActed = false;
                this.state.units.set(unit.unitId, unit);
            }
        }
    }

    private _isCurrentTurn(client: Client): boolean {
        return this.state.phase === "active" && this.state.currentTurnId === client.sessionId;
    }

    /**
     * Atomic combined move+attack transaction.
     *
     * Validates and applies both halves as a single state mutation, so the
     * Colyseus patch broadcast carries either both updates or neither —
     * clients never see a half-applied state.
     *
     * 1-AP model: any successful attack flips `hasMoved = true` (and the
     * legacy `hasActed = true` for back-compat). `unitIsExhausted` gates
     * any further action this turn.
     *
     * If `moveTo` is undefined OR equal to the attacker's current position,
     * the move-half is skipped (zero-move attack). Adjacency is validated
     * against the attacker's pre-mutation position.
     *
     * If `moveTo` is a different reachable tile, the move-half applies,
     * adjacency is pre-validated against the post-move position, and the
     * move is rolled back if the attack-half resolves to no-op.
     *
     * Returns silently on any validation failure — no broadcast, no
     * mutation. Caller (the message handler) does not need to act on the
     * outcome.
     */
    private _handleAttack(sessionId: string, payload: AttackUnitPayload | undefined): void {
        if (this.state.phase !== "active") return;
        if (this.state.currentTurnId !== sessionId) return;

        const attacker = this.state.units.get(payload?.attackerId ?? "");
        const target = this.state.units.get(payload?.targetId ?? "");
        if (!attacker || !target) return;
        if (attacker.ownerId !== sessionId) return;
        if (attacker.ownerId === target.ownerId) return;     // friendly-fire blocked
        if (unitIsExhausted(attacker)) return;               // 1-AP exhaustion

        const posBefore: GridCoord = { q: attacker.x, r: attacker.y };
        const targetPos: GridCoord = { q: target.x, r: target.y };
        const moveTo = payload?.moveTo;
        const moveToIsCurrentPos =
            moveTo !== undefined &&
            moveTo.q === posBefore.q &&
            moveTo.r === posBefore.r;

        // ── Half 1: optional move ─────────────────────────────────────
        if (moveTo && !moveToIsCurrentPos) {
            if (attacker.hasMoved) return;                   // already moved this turn
            const reachable = this._reachabilityCache.get(attacker.unitId);
            if (!reachable) return;
            const moveKey = cellKey({ q: moveTo.q, r: moveTo.r });
            if (!reachable.has(moveKey)) return;

            // Pre-validate half-2 adjacency BEFORE mutating
            if (manhattan({ q: moveTo.q, r: moveTo.r }, targetPos) !== 1) return;

            attacker.x = moveTo.q;
            attacker.y = moveTo.r;
            // hasMoved is set unconditionally below after half-2 success.
        } else {
            // Zero-move attack — validate adjacency from current position.
            if (manhattan(posBefore, targetPos) !== 1) return;
        }

        // ── Half 2: resolve attack ────────────────────────────────────
        const damage = computeAttackDamage(attacker.unitType, target.unitType);
        if (damage <= 0) {
            // Defensive: rollback move-half if applied, then bail.
            if (moveTo && !moveToIsCurrentPos) {
                attacker.x = posBefore.q;
                attacker.y = posBefore.r;
            }
            return;
        }

        target.hp = Math.max(0, target.hp - damage);
        const defenderDied = target.hp <= 0;

        // 1-AP exhaustion: flip on any successful attack.
        attacker.hasMoved = true;
        attacker.hasActed = true;

        if (defenderDied) {
            this.state.units.delete(target.unitId);
            this._checkWinCondition();
        }

        // Update reachability cache only when an actual move applied.
        if (moveTo && !moveToIsCurrentPos) {
            this._updateReachabilityAfterMove(attacker.unitId, posBefore, {
                q: moveTo.q,
                r: moveTo.r,
            });
        }
    }

    private _advanceTurn(): void {
        // Reset acted/moved flags for units owned by the current player
        for (const unit of this.state.units.values()) {
            if (unit.ownerId === this.state.currentTurnId) {
                unit.hasMoved = false;
                unit.hasActed = false;
            }
        }

        // Find next non-eliminated player in circular order
        const activePlayers = this._turnOrder.filter(id => {
            const p = this.state.players.get(id);
            return p && !p.isEliminated;
        });

        if (activePlayers.length === 0) return;

        const currentIndex = activePlayers.indexOf(this.state.currentTurnId);
        const nextIndex = (currentIndex + 1) % activePlayers.length;
        this.state.currentTurnId = activePlayers[nextIndex]!;

        // Increment round counter when we wrap back to the first player
        if (nextIndex === 0) {
            this.state.turnNumber++;
        }

        this._rebuildReachabilityCache(this.state.currentTurnId);

        console.log(`[GameRoom] Turn advanced to ${this.state.currentTurnId}`);
    }

    /**
     * Rebuild the entire reachability cache for `playerId`'s units.
     * Called on turn start and on player advance.
     */
    private _rebuildReachabilityCache(playerId: string): void {
        this._reachabilityCache.clear();
        const occupied = this._buildOccupiedSet();
        for (const unit of this.state.units.values()) {
            if (unit.ownerId !== playerId) continue;
            if (unit.hasMoved) continue;
            this._reachabilityCache.set(
                unit.unitId,
                computeReachableTiles({
                    getNeighbors: squareGridNeighbors,
                    isOccupied: (k) => occupied.has(k),
                    movement: getUnitMovement(unit.unitType),
                    start: { q: unit.x, r: unit.y },
                }),
            );
        }
    }

    /**
     * Surgical cache update after a single move. The moved unit and any
     * other current-player unit whose old reachable set touched the moved
     * unit's prev or new tile need recomputation. Everything else stays.
     */
    private _updateReachabilityAfterMove(
        movedUnitId: string,
        prevPos: GridCoord,
        newPos: GridCoord,
    ): void {
        const movedUnit = this.state.units.get(movedUnitId);
        if (!movedUnit) return;
        const playerId = movedUnit.ownerId;
        const prevKey = cellKey(prevPos);
        const newKey = cellKey(newPos);
        const occupied = this._buildOccupiedSet();

        const recompute = (unitId: string) => {
            const u = this.state.units.get(unitId);
            if (!u) return;
            this._reachabilityCache.set(
                unitId,
                computeReachableTiles({
                    getNeighbors: squareGridNeighbors,
                    isOccupied: (k) => occupied.has(k),
                    movement: getUnitMovement(u.unitType),
                    start: { q: u.x, r: u.y },
                }),
            );
        };

        for (const [unitId, oldReachable] of [
            ...this._reachabilityCache.entries(),
        ]) {
            const unit = this.state.units.get(unitId);
            if (!unit || unit.ownerId !== playerId) continue;
            if (unitId === movedUnitId) {
                if (unit.hasMoved) {
                    this._reachabilityCache.delete(unitId);
                } else {
                    recompute(unitId);
                }
                continue;
            }
            if (oldReachable.has(prevKey) || oldReachable.has(newKey)) {
                recompute(unitId);
            }
        }
    }

    private _buildOccupiedSet(): Set<string> {
        const occupied = new Set<string>();
        for (const unit of this.state.units.values()) {
            occupied.add(cellKey({ q: unit.x, r: unit.y }));
        }
        return occupied;
    }

    private _checkWinCondition(): void {
        const activePlayers = [...this.state.players.values()].filter(
            p => !p.isEliminated,
        );

        if (activePlayers.length === 1) {
            const winner = activePlayers[0]!;
            this.state.phase = "ended";
            this.state.winnerId = winner.sessionId;
            this.broadcast("game_over", { winnerId: winner.sessionId, displayName: winner.displayName });
            console.log(`[GameRoom] Game over. Winner: ${winner.displayName}`);
        }
    }
}

function manhattan(a: GridCoord, b: GridCoord): number {
    return Math.abs(a.q - b.q) + Math.abs(a.r - b.r);
}
