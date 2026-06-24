import { Room, Client } from "colyseus";
import {
    ActionPointSystem,
    AP_COST,
    GamePlayerSlot,
    GameState,
    GameUnit,
    createTurnMachine,
    type TurnMachine,
    createReactionWindowMachine,
    type ReactionWindowMachine,
    cellKey,
    computeReachableTiles,
    computeAttackDamage,
    getEffectiveMaxHealth,
    getUnitAttack,
    getUnitBaseAp,
    getUnitBaseHealth,
    getUnitDefaultWeakness,
    getUnitDefense,
    getUnitDamageType,
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

const REACTION_TIMEOUT_MS = 10_000;

interface PendingAttack {
    attackerId: string;
    targetId: string;
    damage: number;
    defenderDied: boolean;
    newHp: number;
    /** Where the attacker should end up. Null = zero-move attack. */
    moveTo: GridCoord | null;
    /** Attacker's pos at declare-time (for reachability rebuild on resolve). */
    posBefore: GridCoord;
    /** AP to deduct for the move half on resolve (0 for zero-move attack). */
    moveApCost: number;
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
    /** TurnMachine — tracks which resolution phase the current turn is in. */
    private _turnMachine!: TurnMachine;
    /** Previous TurnMachine phase, used only for transition logging. */
    private _prevTurnPhase: string | null = null;
    /**
     * Pending attack committed in the attack_unit handler, resolved in the
     * "combat" subscriber. Null outside of the quick-play → combat window.
     */
    private _pendingAttack: PendingAttack | null = null;
    private _reactionMachine: ReactionWindowMachine | null = null;
    private _reactionTimer: ReturnType<typeof setTimeout> | null = null;

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
            if (!ActionPointSystem.canAfford(unit, AP_COST.MOVE)) return;

            const destKey = cellKey({ q: payload.x, r: payload.y });
            const reachable = this._reachabilityCache.get(unit.unitId);
            if (!reachable || !reachable.has(destKey)) return;

            const prevPos: GridCoord = { q: unit.x, r: unit.y };
            unit.x = payload.x;
            unit.y = payload.y;
            unit.hasMoved = true;
            ActionPointSystem.deduct(unit, AP_COST.MOVE);

            console.log(`[${new Date().toISOString()}] [GameRoom] action-phase: move ${unit.unitId} (${prevPos.q},${prevPos.r}) → (${payload.x},${payload.y})`);
            console.log(`[${new Date().toISOString()}] [GameRoom] ap: ${unit.unitId} spent ${AP_COST.MOVE} (move) → ${unit.actionPoints} remaining`);

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
            console.log(`[${new Date().toISOString()}] [GameRoom] action-phase: end_turn from ${client.sessionId}`);
            this._turnMachine.send("END_TURN");
        });

        this.onMessage("pass_reaction", (client) => {
            if (!this._reactionMachine) return;
            const phase = this._reactionMachine.state;
            const ctx = this._reactionMachine.context;
            const expected =
                phase === "defender" ? ctx.defenderOwnerId :
                phase === "attacker-ally" ? ctx.attackerOwnerId :
                null;
            if (expected === null || client.sessionId !== expected) return;
            this._clearReactionTimer();
            this._reactionMachine.send("REACTION_PASS");
        });

        this.onMessage<{ cardId: string }>("play_reaction_card", (client, payload) => {
            // Card system pending — reject all cards until is_reaction validation is wired.
            console.log(`[${new Date().toISOString()}] [GameRoom] play_reaction_card: rejected (card system pending) from ${client.sessionId}`);
            void client;
            void payload;
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

        console.log(`[${new Date().toISOString()}] [GameRoom] ${displayName} joined (${client.sessionId})`);

        if (this._allPlayersJoined()) {
            this._startGame();
        }
    }

    async onDrop(client: Client, code?: number): Promise<void> {
        try {
            await this.allowReconnection(client, 30);
            console.log(`[${new Date().toISOString()}] [GameRoom] ${client.sessionId} reconnected`);
        } catch {
            console.log(`[${new Date().toISOString()}] [GameRoom] ${client.sessionId} reconnect window expired (code ${code})`);
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
            console.log(`[${new Date().toISOString()}] [GameRoom] ${player.displayName} eliminated`);
        }
        if (this.state.currentTurnId === sessionId) {
            // Only fire END_TURN if the machine is in action-phase. If
            // mid-resolution (quick-play / combat / post-combat), the pipeline
            // will complete and land back in action-phase naturally. If in
            // declare-end-turn, TURN_ADVANCED is already pending.
            if (this._turnMachine && this._turnMachine.state === "action-phase") {
                this._turnMachine.send("END_TURN");
            }
        }
        this._checkWinCondition();
    }

    private _allPlayersJoined(): boolean {
        return this._pendingPlayers.size === 0;
    }

    private _startGame(): void {
        console.log(`[${new Date().toISOString()}] [GameRoom] phase: setup → active`);
        this.state.phase = "active";
        this.state.currentTurnId = this._turnOrder[0] ?? "";

        this._spawnInitialUnits();
        this._rebuildReachabilityCache(this.state.currentTurnId);

        this._turnMachine = createTurnMachine(this.state.currentTurnId);
        this._turnMachine.subscribe((phase) => this._onTurnPhase(phase));

        console.log(
            `[${new Date().toISOString()}] [GameRoom] Game started. First turn: ${this.state.currentTurnId}. Units: ${this.state.units.size}`,
        );
    }

    /**
     * TurnMachine subscriber. All Colyseus mutations triggered by phase
     * transitions happen here. Fires synchronously within the same call
     * stack as the send() that caused the transition.
     *
     * Re-entrancy: when "quick-play" fires and immediately calls
     * send("QUICK_PLAY_RESOLVED"), the "combat" case runs before this
     * "quick-play" case returns. Max stack depth: 4 send() calls (attack
     * path). Safe — Node.js is single-threaded.
     */
    private _onTurnPhase(phase: string): void {
        console.log(`[${new Date().toISOString()}] [GameRoom] turnPhase: ${this._prevTurnPhase ?? "null"} → ${phase}`);
        this._prevTurnPhase = phase;
        this.state.turnPhase = phase;

        switch (phase) {
            case "action-phase":
                console.log(`[${new Date().toISOString()}] [GameRoom] action-phase: awaiting input from ${this.state.currentTurnId}`);
                break;

            case "declare-end-turn":
                this._performTurnAdvance();
                this._turnMachine.send("TURN_ADVANCED", {
                    playerId: this.state.currentTurnId,
                });
                break;

            case "quick-play":
                this._openReactionWindow();
                break;

            case "combat":
                this._resolvePendingAttack();
                if (this.state.phase !== "ended") {
                    this._turnMachine.send("COMBAT_RESOLVED");
                }
                break;

            case "post-combat":
                console.log(`[${new Date().toISOString()}] [GameRoom] post-combat: gold distribution pending`);
                this._turnMachine.send("POST_COMBAT_RESOLVED");
                break;
        }
    }

    private _openReactionWindow(): void {
        const pa = this._pendingAttack;
        if (!pa) {
            this._turnMachine.send("QUICK_PLAY_RESOLVED");
            return;
        }

        const attackerUnit = this.state.units.get(pa.attackerId);
        const defenderUnit = this.state.units.get(pa.targetId);
        if (!attackerUnit || !defenderUnit) {
            this._turnMachine.send("QUICK_PLAY_RESOLVED");
            return;
        }

        this._reactionMachine = createReactionWindowMachine(
            attackerUnit.ownerId,
            defenderUnit.ownerId,
        );
        this._reactionMachine.subscribe((phase) => this._onReactionPhase(phase));
    }

    private _onReactionPhase(phase: string): void {
        console.log(`[${new Date().toISOString()}] [GameRoom] reactionPhase: ${phase}`);
        this.state.reactionPhase = phase === "closed" ? "" : phase;

        const ctx = this._reactionMachine?.context;
        const activePlayer = this._activeReactionPlayer(
            phase,
            ctx?.attackerOwnerId,
            ctx?.defenderOwnerId,
        );
        this.broadcast("reaction_phase", { phase, activePlayer });

        switch (phase) {
            case "defender":
                this._startReactionTimer();
                break;

            case "defender-ally":
                this._clearReactionTimer();
                this._startReactionTimer();
                this._reactionMachine?.send("REACTION_PASS");  // placeholder: auto-pass
                break;

            case "attacker-ally":
                this._clearReactionTimer();
                this._startReactionTimer();
                this._reactionMachine?.send("REACTION_PASS");  // placeholder: auto-pass
                break;

            case "resolve":
                this._clearReactionTimer();
                this._reactionMachine?.send("REACTION_PASS");
                break;

            case "closed":
                this._clearReactionTimer();
                this._reactionMachine = null;
                this._turnMachine.send("QUICK_PLAY_RESOLVED");
                break;
        }
    }

    private _activeReactionPlayer(
        phase: string,
        attackerOwnerId?: string,
        defenderOwnerId?: string,
    ): string {
        if (phase === "defender") return defenderOwnerId ?? "";
        if (phase === "attacker-ally") return attackerOwnerId ?? "";
        return "";
    }

    private _startReactionTimer(): void {
        this._clearReactionTimer();
        this._reactionTimer = setTimeout(() => {
            if (!this._reactionMachine) return;
            this._clearReactionTimer();
            this._reactionMachine.send("REACTION_TIMEOUT");
        }, REACTION_TIMEOUT_MS);
    }

    private _clearReactionTimer(): void {
        if (this._reactionTimer !== null) {
            clearTimeout(this._reactionTimer);
            this._reactionTimer = null;
        }
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
                unit.unitId  = `${sessionId}:u${j + 1}`;
                unit.ownerId = sessionId;
                unit.unitType = unitTypes[j]!;
                unit.x = 2 + j * 2;
                unit.y = row;

                unit.baseMaxHealth    = getUnitBaseHealth(unit.unitType);
                unit.baseAttackDamage = getUnitAttack(unit.unitType);
                unit.baseDefense      = getUnitDefense(unit.unitType);
                unit.baseMovement     = getUnitMovement(unit.unitType);
                unit.baseAp           = getUnitBaseAp(unit.unitType);

                unit.hp = getEffectiveMaxHealth(unit);

                const dt = getUnitDamageType(unit.unitType);
                unit.damageType = dt ?? "";
                for (const w of getUnitDefaultWeakness(unit.unitType)) {
                    unit.weakness.push(w);
                }

                unit.hasMoved = false;
                unit.hasActed = false;
                ActionPointSystem.restore(unit);
                this.state.units.set(unit.unitId, unit);
            }
        }
    }

    private _isCurrentTurn(client: Client): boolean {
        return (
            this.state.phase === "active" &&
            this.state.currentTurnId === client.sessionId &&
            this._turnMachine.state === "action-phase"
        );
    }

    /**
     * Atomic combined move+attack transaction.
     *
     * Validates and commits both halves (move-half + attacker exhaustion),
     * sets _pendingAttack, then fires ATTACK_DECLARED into the TurnMachine.
     * Actual HP mutation and unit deletion are deferred to the "combat"
     * subscriber via _resolvePendingAttack().
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
        if (!this._turnMachine || this._turnMachine.state !== "action-phase") return;
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

        // ── Half 1: validate optional move (no mutation) ──────────────
        if (moveTo && !moveToIsCurrentPos) {
            if (!ActionPointSystem.canAfford(attacker, AP_COST.MOVE)) return;
            const reachable = this._reachabilityCache.get(attacker.unitId);
            if (!reachable) return;
            const moveKey = cellKey({ q: moveTo.q, r: moveTo.r });
            if (!reachable.has(moveKey)) return;

            // Pre-validate half-2 adjacency from post-move position.
            if (manhattan({ q: moveTo.q, r: moveTo.r }, targetPos) !== 1) return;
        } else {
            // Zero-move attack — validate adjacency from current position.
            if (manhattan(posBefore, targetPos) !== 1) return;
        }

        // ── Half 2: pre-compute damage (no mutation) ─────────────────
        const damage = computeAttackDamage(attacker, target);
        if (damage <= 0) return;

        const newHp = Math.max(0, target.hp - damage);
        const defenderDied = newHp <= 0;

        // All attacker-side mutations (pos / hasMoved / hasActed / AP /
        // reachability) are deferred to _resolvePendingAttack so that the
        // reaction window can run in between without leaking partial state
        // patches to clients. The client's snapshot-diff classifier needs
        // the attacker's hasMoved flip and the target's HP drop to land in
        // the same patch to produce an AttackEvent.
        const moveCommitted = moveTo !== undefined && !moveToIsCurrentPos;

        this._pendingAttack = {
            attackerId: attacker.unitId,
            targetId: target.unitId,
            damage,
            defenderDied,
            newHp,
            moveTo: moveCommitted ? { q: moveTo.q, r: moveTo.r } : null,
            posBefore,
            moveApCost: moveCommitted ? AP_COST.MOVE : 0,
        };

        console.log(`[${new Date().toISOString()}] [GameRoom] action-phase: attack declared ${attacker.unitId} → ${target.unitId} (dmg ${damage}${defenderDied ? ", lethal" : ""})`);

        // Fires: action-phase → quick-play → combat → post-combat → action-phase
        // (synchronous call stack, safe in single-threaded Node.js)
        this._turnMachine.send("ATTACK_DECLARED");
    }

    /**
     * Apply the pending attack committed in _handleAttack(). Called from
     * the "combat" subscriber. Sets _pendingAttack = null on exit.
     *
     * If defenderDied: deletes the unit from state.units and calls
     * _checkWinCondition(). HP is NOT written in this case.
     * If defender survived: writes newHp to target.hp.
     */
    private _resolvePendingAttack(): void {
        const pa = this._pendingAttack;
        if (!pa) return;
        this._pendingAttack = null;

        // ── Apply deferred attacker mutations ────────────────────────
        // Order: move attacker → exhaust + AP deduct → reachability refresh.
        // All four happen in the same Colyseus state patch as the target's
        // HP / death write below, so the client's diffSnapshots classifier
        // sees the hasMoved flip and the HP drop together and produces a
        // single AttackEvent for buildAttackSequence.
        const attacker = this.state.units.get(pa.attackerId);
        if (attacker) {
            if (pa.moveTo) {
                attacker.x = pa.moveTo.q;
                attacker.y = pa.moveTo.r;
                if (pa.moveApCost > 0) {
                    ActionPointSystem.deduct(attacker, pa.moveApCost);
                    console.log(`[${new Date().toISOString()}] [GameRoom] ap: ${attacker.unitId} spent ${pa.moveApCost} (move) → ${attacker.actionPoints} remaining`);
                }
            }
            attacker.hasMoved = true;
            attacker.hasActed = true;
            ActionPointSystem.deduct(attacker, AP_COST.ATTACK);
            console.log(`[${new Date().toISOString()}] [GameRoom] ap: ${attacker.unitId} spent ${AP_COST.ATTACK} (attack) → ${attacker.actionPoints} remaining`);

            if (pa.moveTo) {
                this._updateReachabilityAfterMove(attacker.unitId, pa.posBefore, pa.moveTo);
            } else {
                this._reachabilityCache.delete(attacker.unitId);
            }
        }

        const target = this.state.units.get(pa.targetId);
        if (!target) return;

        if (pa.defenderDied) {
            console.log(
                `[${new Date().toISOString()}] [GameRoom] combat: ${pa.attackerId} → ${pa.targetId} | dmg ${pa.damage} | hp ${target.hp} → 0 (died)`,
            );
            this.state.units.delete(pa.targetId);
            this._checkUnitElimination();
        } else {
            console.log(
                `[${new Date().toISOString()}] [GameRoom] combat: ${pa.attackerId} → ${pa.targetId} | dmg ${pa.damage} | hp ${target.hp} → ${pa.newHp}`,
            );
            target.hp = pa.newHp;
        }
    }

    private _performTurnAdvance(): void {
        // Reset acted/moved flags for units owned by the current player
        for (const unit of this.state.units.values()) {
            if (unit.ownerId === this.state.currentTurnId) {
                unit.hasMoved = false;
                unit.hasActed = false;
                ActionPointSystem.restore(unit);
                console.log(`[${new Date().toISOString()}] [GameRoom] ap: ${unit.unitId} restored → ${unit.actionPoints}`);
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
        const prevTurnId = this.state.currentTurnId;
        this.state.currentTurnId = activePlayers[nextIndex]!;

        // Increment round counter when we wrap back to the first player
        if (nextIndex === 0) {
            this.state.turnNumber++;
            console.log(`[${new Date().toISOString()}] [GameRoom] turnNumber → ${this.state.turnNumber}`);
        }

        this._rebuildReachabilityCache(this.state.currentTurnId);

        console.log(`[${new Date().toISOString()}] [GameRoom] currentTurnId: ${prevTurnId} → ${this.state.currentTurnId}`);
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

    /**
     * Scan unit ownership and mark players with 0 remaining units as
     * eliminated. Called after a unit dies in combat. Falls through to
     * `_checkWinCondition()` so the standard last-player-standing path
     * still ends the game.
     */
    private _checkUnitElimination(): void {
        const unitsByOwner = new Map<string, number>();
        for (const unit of this.state.units.values()) {
            unitsByOwner.set(unit.ownerId, (unitsByOwner.get(unit.ownerId) ?? 0) + 1);
        }
        for (const player of this.state.players.values()) {
            if (player.isEliminated) continue;
            const count = unitsByOwner.get(player.sessionId) ?? 0;
            if (count === 0) {
                player.isEliminated = true;
                console.log(`[${new Date().toISOString()}] [GameRoom] ${player.displayName} has no units remaining — eliminated`);
            }
        }
        this._checkWinCondition();
    }

    private _checkWinCondition(): void {
        const activePlayers = [...this.state.players.values()].filter(
            p => !p.isEliminated,
        );

        if (activePlayers.length === 1) {
            const winner = activePlayers[0]!;
            console.log(`[${new Date().toISOString()}] [GameRoom] phase: active → ended`);
            this.state.phase = "ended";
            this.state.winnerId = winner.sessionId;
            this.broadcast("game_over", { winnerId: winner.sessionId, displayName: winner.displayName });
            console.log(`[${new Date().toISOString()}] [GameRoom] Game over. Winner: ${winner.displayName}`);
        }
    }
}

function manhattan(a: GridCoord, b: GridCoord): number {
    return Math.abs(a.q - b.q) + Math.abs(a.r - b.r);
}
