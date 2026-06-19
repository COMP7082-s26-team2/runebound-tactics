import { Room, Client } from "colyseus";
import {
    GamePlayerSlot,
    GameState,
    GameUnit,
    createTurnMachine,
    type TurnMachine,
    cellKey,
    computeReachableTiles,
    computeAttackDamage,
    getUnitMovement,
    squareGridNeighbors,
    unitIsExhausted,
    GRID_ROWS,
} from "@runebound-tactics/shared";
import type { Faction, GridCoord } from "@runebound-tactics/shared";
import { AuthJoinError, verifySupabaseJoinAuth } from "../auth/supabaseAuth";
import type { AuthenticatedJoinOptions, VerifiedClientAuth } from "../auth/types";
import { pendingGames } from "./pendingGames";

interface PendingPlayer {
    userId: string;
    displayName: string;
    faction: string;
}

interface GameRoomOptions {
    lobbyRoomId: string;
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

interface PendingAttack {
    attackerId: string;
    targetId: string;
    damage: number;
    defenderDied: boolean;
    newHp: number;
}

export class GameRoom extends Room<{ state: GameState }> {
    /** Players expected to join, keyed by verified player.user_id. Set in onCreate. */
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

        // LobbyRoom already verified the users that started this match and
        // wrote their app player IDs into pendingGames. GameRoom keys this
        // waiting list by userId so a client cannot claim a slot by spoofing a
        // display name in join options.
        for (const p of pending.players) {
            this._pendingPlayers.set(p.userId, p);
        }

        this.onMessage<MoveUnitPayload>("move_unit", (client, payload) => {
            // Resolve the verified player first. The action is attributed to
            // player.userId, then bridged to the current sessionId-based game
            // model for unit ownership and turn checks.
            const player = this._getVerifiedPlayer(client);
            if (!player) return;

            const playerSessionId = player.sessionId;
            if (!this._isCurrentTurn(player)) return;

            const unit = this.state.units.get(payload?.unitId);
            if (!unit || unit.ownerId !== playerSessionId) return;
            if (unit.hasMoved) return;

            const destKey = cellKey({ q: payload.x, r: payload.y });
            const reachable = this._reachabilityCache.get(unit.unitId);
            if (!reachable || !reachable.has(destKey)) return;

            const prevPos: GridCoord = { q: unit.x, r: unit.y };
            unit.x = payload.x;
            unit.y = payload.y;
            unit.hasMoved = true;

            console.log(`[${new Date().toISOString()}] [GameRoom] action-phase: move ${unit.unitId} (${prevPos.q},${prevPos.r}) → (${payload.x},${payload.y})`);

            this._updateReachabilityAfterMove(unit.unitId, prevPos, {
                q: payload.x,
                r: payload.y,
            });
        });

        this.onMessage<AttackUnitPayload>("attack_unit", (client, payload) => {
            // Pass the whole Client so _handleAttack can verify client.auth
            // before it uses client.sessionId for current gameplay ownership.
            this._handleAttack(client, payload);
        });

        this.onMessage("end_turn", (client) => {
            // End-turn also starts from the verified player slot. The
            // sessionId comparison below is derived from that slot, not trusted
            // directly from the raw Colyseus client.
            const player = this._getVerifiedPlayer(client);
            if (!player) return;

            if (!this._isCurrentTurn(player)) return;
            console.log(`[${new Date().toISOString()}] [GameRoom] action-phase: end_turn from ${client.sessionId}`);
            this._turnMachine.send("END_TURN");
        });
    }

    async onAuth(
        _client: Client,
        options?: AuthenticatedJoinOptions,
    ): Promise<VerifiedClientAuth> {
        try {
            // onAuth is the gate before onJoin. The returned payload becomes
            // client.auth, which lets the room connect this Colyseus session to
            // a verified app player instead of trusting join options.
            return await verifySupabaseJoinAuth(options);
        } catch (error) {
            // Never log the raw access token or join options here.
            if (error instanceof AuthJoinError) {
                console.warn(`[GameRoom] Rejected unauthenticated join: ${error.message}`);
            } else {
                console.error("[GameRoom] Auth verification failed:", error);
            }
            throw error;
        }
    }

    onJoin(client: Client): void {
        // Colyseus sets client.auth from the value returned by onAuth. If it is
        // missing here, the room should fail closed rather than creating an
        // anonymous GamePlayerSlot.
        const userId = this._getVerifiedUserId(client);
        if (!userId) {
            throw new Error("Missing verified game auth");
        }

        // Only players transferred from the lobby can claim game slots. The
        // lookup is by verified app userId, not displayName, because displayName
        // is client-controlled in older flows.
        const pending = this._pendingPlayers.get(userId);
        if (!pending) {
            throw new Error("Authenticated user is not expected in this game");
        }

        const displayName = pending.displayName.slice(0, 32);

        const slot = new GamePlayerSlot();
        // sessionId is still used by the current GameRoom maps, turn order, and
        // unit owner IDs. userId is the durable identity that future reconnect
        // and enforcement tickets can use when sessionId changes.
        slot.sessionId = client.sessionId;
        slot.userId = userId;
        slot.displayName = displayName;
        slot.faction = pending.faction as Faction;
        this.state.players.set(client.sessionId, slot);

        // Remove the verified user from the pending list after they claim their
        // seat; _allPlayersJoined() uses this to decide when the match can start.
        this._pendingPlayers.delete(userId);
        this._turnOrder.push(client.sessionId);

        console.log(
            `[${new Date().toISOString()}] [GameRoom] ${displayName} joined as user ${userId} (${client.sessionId})`,
        );

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
                console.log(`[${new Date().toISOString()}] [GameRoom] quick-play: no opponent responses`);
                this._turnMachine.send("QUICK_PLAY_RESOLVED");
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

    private _isCurrentTurn(player: GamePlayerSlot): boolean {
        return (
            this.state.phase === "active" &&
            this.state.currentTurnId === player.sessionId &&
            this._turnMachine.state === "action-phase"
        );
    }

    private _getVerifiedUserId(client: Client): string | null {
        const auth = client.auth as VerifiedClientAuth | undefined;
        return auth?.userId ?? null;
    }

    private _getVerifiedPlayer(client: Client): GamePlayerSlot | null {
        const userId = this._getVerifiedUserId(client);
        const player = this.state.players.get(client.sessionId);

        // sessionId is still the current connection key, but the connected
        // client must also match the verified userId stored when they joined.
        if (!userId || !player || player.userId !== userId) {
            return null;
        }

        return player;
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
    private _handleAttack(client: Client, payload: AttackUnitPayload | undefined): void {
        if (!this._turnMachine || this._turnMachine.state !== "action-phase") return;
        if (this.state.phase !== "active") return;
        // Attack has its own guard because it enters through a helper instead
        // of _isCurrentTurn directly.
        const player = this._getVerifiedPlayer(client);
        if (!player) return;

        // Keep the current gameplay model sessionId-based for now. BCOMP-175's
        // first step is to prove that this session belongs to the authenticated
        // user before allowing sessionId-based ownership checks.
        const playerSessionId = player.sessionId;
        if (this.state.currentTurnId !== playerSessionId) return;

        const attacker = this.state.units.get(payload?.attackerId ?? "");
        const target = this.state.units.get(payload?.targetId ?? "");
        if (!attacker || !target) return;
        if (attacker.ownerId !== playerSessionId) return;
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

        const newHp = Math.max(0, target.hp - damage);
        const defenderDied = newHp <= 0;

        // 1-AP exhaustion: flip on any successful attack.
        attacker.hasMoved = true;
        attacker.hasActed = true;

        // Update reachability cache. Move+attack uses surgical update;
        // zero-move attack just removes the now-exhausted attacker.
        if (moveTo && !moveToIsCurrentPos) {
            this._updateReachabilityAfterMove(attacker.unitId, posBefore, {
                q: moveTo.q,
                r: moveTo.r,
            });
        } else {
            this._reachabilityCache.delete(attacker.unitId);
        }

        this._pendingAttack = {
            attackerId: attacker.unitId,
            targetId: target.unitId,
            damage,
            defenderDied,
            newHp,
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

        const target = this.state.units.get(pa.targetId);
        if (!target) return;

        if (pa.defenderDied) {
            console.log(
                `[${new Date().toISOString()}] [GameRoom] combat: ${pa.attackerId} → ${pa.targetId} | dmg ${pa.damage} | hp ${target.hp} → 0 (died)`,
            );
            this.state.units.delete(pa.targetId);
            this._checkWinCondition();
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
