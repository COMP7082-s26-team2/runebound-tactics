import { Room, Client } from "colyseus";
import {
    ActionPointSystem,
    AP_COST,
    CHOKEPOINT_MAP,
    GamePlayerSlot,
    GameState,
    GameUnit,
    createTurnMachine,
    type TurnMachine,
    canEnter,
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
    getUnitMovementType,
    squareGridNeighbors,
    terrainAt,
    unitIsExhausted,
    GRID_ROWS,
} from "@runebound-tactics/shared";
import type { Faction, GridCoord } from "@runebound-tactics/shared";
import { AuthJoinError, verifySupabaseJoinAuth } from "../auth/supabaseAuth";
import type { AuthenticatedJoinOptions, VerifiedClientAuth } from "../auth/types";
import { markUserInGame, markUserLeftGame, markUserOffline } from "../presence/userPresence";
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

// Product default for how long a disconnected game player keeps their slot
// before the server treats the disconnect as a forfeit.
// Deployments can override this with GAME_RECONNECT_WINDOW_SECONDS.
const DEFAULT_RECONNECT_WINDOW_SECONDS = 60;
// Colyseus SDK sends this close code when the client intentionally leaves via
// room.leave(true). Other close codes are treated as accidental disconnects.
const COLYSEUS_CONSENTED_LEAVE_CODE = 4000;

// Reads the reconnect window from env and falls back to the product default if
// the env var is missing, non-numeric, or invalid.
function getReconnectWindowSeconds(): number {
    const raw = Number(process.env.GAME_RECONNECT_WINDOW_SECONDS);

    // Keep local/dev behavior deterministic while still letting deployments
    // tune the reconnect grace period through environment config.
    return Number.isFinite(raw) && raw > 0
        ? raw
        : DEFAULT_RECONNECT_WINDOW_SECONDS;
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
     * Session IDs currently inside an allowReconnection window. The player
     * slot, turn order, and units stay in state while the id is present here,
     * which keeps the match recoverable until the timer resolves.
     */
    private _reconnectingSessionIds = new Set<string>();
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

    async onJoin(client: Client): Promise<void> {
        // Colyseus sets client.auth from the value returned by onAuth. If it is
        // missing here, the room should fail closed rather than creating an
        // anonymous GamePlayerSlot.
        const userId = this._getVerifiedUserId(client);
        if (!userId) {
            throw new Error("Missing verified game auth");
        }
        const auth = client.auth as VerifiedClientAuth;

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

        // Game presence is written only after the verified user has claimed a
        // real game slot. markUserInGame also clears any lobby id left over
        // from the lobby-to-game transfer.
        await this._markPlayerInGame(userId, auth.supabaseSessionId);

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

    async onLeave(client: Client, code?: number): Promise<void> {
        // This Colyseus version passes a WebSocket close code here. A consented
        // close means the user intentionally left; any other close is treated
        // as a dropped connection that may come back.
        const consented = code === COLYSEUS_CONSENTED_LEAVE_CODE;

        // A consented leave is an intentional exit, so the player forfeits
        // immediately instead of receiving a reconnect grace window.
        if (consented) {
            await this._forfeitPlayer(client.sessionId);
            return;
        }

        // Unconsented leaves are network drops, tab refreshes, or browser
        // interruptions. Hold the slot open so the same connection can be
        // restored within the configured window.
        await this._holdSlotForReconnection(client);
    }

    private async _forfeitPlayer(sessionId: string): Promise<void> {
        // Forfeit currently uses the same state transition as elimination:
        // mark the player out, clear their active game presence, and let the
        // win-condition check decide whether the match is over.
        await this._eliminatePlayer(sessionId);
    }

    private async _holdSlotForReconnection(client: Client): Promise<void> {
        const player = this._getVerifiedPlayer(client);

        if (!player) {
            // If the disconnected client no longer maps to a verified player
            // slot, there is no safe identity to reserve.
            await this._forfeitPlayer(client.sessionId);
            return;
        }

        // If Colyseus reports another unconsented leave for the same session
        // while a reconnect is already pending, keep the first window as the
        // authority and avoid starting duplicate timeout work.
        if (this._reconnectingSessionIds.has(client.sessionId)) {
            return;
        }

        const reconnectWindowSeconds = getReconnectWindowSeconds();
        this._reconnectingSessionIds.add(client.sessionId);

        // Notify the remaining connected players that this slot is reserved
        // temporarily rather than eliminated immediately.
        this.broadcast("player_disconnected", {
            userId: player.userId,
            sessionId: player.sessionId,
            displayName: player.displayName,
            reconnectWindowSeconds,
        });

        // Mark the player offline for presence, but keep current_room_id and
        // all game state intact so the slot can be reclaimed during the window.
        await this._markPlayerOffline(player.userId);

        try {
            const reconnectedClient = await this.allowReconnection(
                client,
                reconnectWindowSeconds,
            );
            const reconnectedPlayer = this._getVerifiedPlayer(reconnectedClient);
            const auth = reconnectedClient.auth as VerifiedClientAuth | undefined;

            this._reconnectingSessionIds.delete(client.sessionId);

            // The reconnected client must still resolve to the same verified
            // game slot and carry the persisted session id used for presence.
            if (!reconnectedPlayer || !auth?.supabaseSessionId) {
                reconnectedClient.leave();
                await this._forfeitPlayer(client.sessionId);
                return;
            }

            await this._markPlayerInGame(
                reconnectedPlayer.userId,
                auth.supabaseSessionId,
            );

            // Let connected players remove any disconnected indicator after
            // the returning player has been verified and presence is restored.
            this.broadcast("player_reconnected", {
                userId: reconnectedPlayer.userId,
                sessionId: reconnectedPlayer.sessionId,
                displayName: reconnectedPlayer.displayName,
            });

            // No manual state reconstruction is needed here. After this
            // reconnect handler completes, Colyseus finishes the JOIN_ROOM
            // handshake and automatically sends the room's current full
            // schema state to the restored client.
        } catch {
            await this._handleReconnectTimeout(player);
        }
    }

    private async _handleReconnectTimeout(player: GamePlayerSlot): Promise<void> {
        // Release the in-memory reservation before changing player/game state.
        this._reconnectingSessionIds.delete(player.sessionId);

        // Notify clients before forfeit processing so they can distinguish a
        // reconnect timeout from combat elimination or intentional leave.
        this.broadcast("player_reconnect_timeout", {
            userId: player.userId,
            sessionId: player.sessionId,
            displayName: player.displayName,
        });

        // Forfeit marks this player eliminated, clears their current game
        // presence, and evaluates the remaining players for a winner.
        await this._forfeitPlayer(player.sessionId);
    }

    private async _eliminatePlayer(sessionId: string): Promise<void> {
        const player = this.state.players.get(sessionId);

        // Multiple disconnect, timeout, or leave paths may converge here. Once
        // a player is eliminated, do not clear presence, advance the turn, or
        // evaluate the winner a second time.
        if (player?.isEliminated) {
            return;
        }

        if (player) {
            player.isEliminated = true;
            console.log(`[${new Date().toISOString()}] [GameRoom] ${player.displayName} eliminated`);
            // Explicit leave or reconnect timeout means this player no longer
            // has a claim to this active game room for presence lookup.
            await this._markPlayerLeftGame(player.userId);
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

    private _canReclaimPlayerSlot(client: Client, previousClient: Client): boolean {
        const userId = this._getVerifiedUserId(client);
        const previousPlayer = this.state.players.get(previousClient.sessionId);

        // When a player reconnects, Colyseus gives us a new/current client and
        // the previous disconnected client. The reconnect should only succeed
        // when the current client's verified app userId matches the userId that
        // was stored on the previous player slot.
        //
        // This prevents another authenticated player from reclaiming someone
        // else's game slot even if they somehow reach the same room/reconnect
        // path. The durable userId is the authority here, not the Colyseus
        // sessionId, which can change across reconnect flows.
        //
        // Reconnect ownership is based on the durable app userId stored in the
        // previous player slot, not on either Colyseus sessionId by itself.
        return !!userId && !!previousPlayer && previousPlayer.userId === userId;
    }

    private async _markPlayerInGame(
        userId: string,
        supabaseSessionId: string,
    ): Promise<void> {
        try {
            await markUserInGame(userId, this.roomId, supabaseSessionId);
        } catch (error) {
            console.error(
                `[GameRoom] Failed to mark user ${userId} in game ${this.roomId}:`,
                error,
            );
        }
    }

    private async _markPlayerLeftGame(userId: string): Promise<void> {
        try {
            await markUserLeftGame(userId, this.roomId);
        } catch (error) {
            console.error(
                `[GameRoom] Failed to clear game presence for user ${userId} in game ${this.roomId}:`,
                error,
            );
        }
    }

    private async _markPlayerOffline(userId: string): Promise<void> {
        try {
            await markUserOffline(userId);
        } catch (error) {
            console.error(
                `[GameRoom] Failed to mark user ${userId} offline for game ${this.roomId}:`,
                error,
            );
        }
    }

    private _clearGamePresenceForAllPlayers(): void {
        // Game-over cleanup is best-effort presence maintenance. We do not
        // await each write here because _checkWinCondition is called from sync
        // combat resolution, but each helper logs its own DB failure.
        for (const player of this.state.players.values()) {
            void this._markPlayerLeftGame(player.userId);
        }
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
            const movementType = getUnitMovementType(unit.unitType);
            this._reachabilityCache.set(
                unit.unitId,
                computeReachableTiles({
                    getNeighbors: squareGridNeighbors,
                    isOccupied: (k) => occupied.has(k),
                    canEnter: (coord) =>
                        canEnter({ movementType }, terrainAt(CHOKEPOINT_MAP, coord.r, coord.q)),
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
        _prevPos: GridCoord,
        _newPos: GridCoord,
    ): void {
        // Full rebuild of the active player's reachability cache.
        //
        // Why not a surgical update keyed on the moved unit's prev/new tile:
        // the old "surgical" pass recomputed only units whose oldReachable
        // set already contained prevKey or newKey. But the moved unit was
        // BLOCKING prevKey before this call — so prevKey was never in any
        // other unit's reachable set. The condition collapsed to
        // "recompute only if newKey was previously reachable," missing the
        // common case where vacating prevKey opens new paths for a teammate
        // standing on the other side. A second friendly couldn't move into
        // the just-vacated tile because their cached BFS still treated it
        // as occupied.
        //
        // _rebuildReachabilityCache iterates the player's units, skips ones
        // with hasMoved=true (the moved unit just had that flag set), and
        // recomputes the rest. O(units × cells) per move with N=4 units —
        // sub-millisecond, no perf concern.
        const movedUnit = this.state.units.get(movedUnitId);
        if (!movedUnit) return;
        this._rebuildReachabilityCache(movedUnit.ownerId);
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
            this._clearGamePresenceForAllPlayers();
            this.broadcast("game_over", { winnerId: winner.sessionId, displayName: winner.displayName });
            console.log(`[${new Date().toISOString()}] [GameRoom] Game over. Winner: ${winner.displayName}`);
        }
    }
}

function manhattan(a: GridCoord, b: GridCoord): number {
    return Math.abs(a.q - b.q) + Math.abs(a.r - b.r);
}
