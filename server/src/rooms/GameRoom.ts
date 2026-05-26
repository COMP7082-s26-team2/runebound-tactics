import { Room, Client } from "colyseus";
import { GamePlayerSlot, GameState, GameUnit } from "@runebound-tactics/shared";
import type { Faction } from "@runebound-tactics/shared";
import { UNIT_STATS, SIDE_POSITIONS, FACTION_ROSTERS } from "./unitStats";
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
}

export class GameRoom extends Room<{ state: GameState }> {
    /** Players expected to join, keyed by displayName. Set in onCreate. */
    private _pendingPlayers = new Map<string, PendingPlayer>();
    /** Ordered turn list — session IDs in the order players joined. */
    private _turnOrder: string[] = [];

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

            const stats = UNIT_STATS[unit.unitType];
            if (!stats) return;
            const dx = Math.abs(payload.x - unit.x);
            const dy = Math.abs(payload.y - unit.y);
            if (dx + dy > stats.movement) return;
            if (payload.x < 0 || payload.x > 9 || payload.y < 0 || payload.y > 9) return;
            const occupied = [...this.state.units.values()].some(
                u => u.unitId !== unit.unitId && u.x === payload.x && u.y === payload.y
            );
            if (occupied) return;
            unit.x = payload.x;
            unit.y = payload.y;
            unit.hasMoved = true;
        });

        this.onMessage<AttackUnitPayload>("attack_unit", (client, payload) => {
            if (!this._isCurrentTurn(client)) return;

            const attacker = this.state.units.get(payload?.attackerId);
            const target = this.state.units.get(payload?.targetId);
            if (!attacker || !target) return;
            if (attacker.ownerId !== client.sessionId) return;
            if (attacker.hasActed) return;

            const attackerStats = UNIT_STATS[attacker.unitType];
            const targetStats = UNIT_STATS[target.unitType];
            if (!attackerStats || !targetStats) return;
            const adx = Math.abs(attacker.x - target.x);
            const ady = Math.abs(attacker.y - target.y);
            if (adx + ady > attackerStats.attackRange) return;
            const damage = Math.max(1, attackerStats.attack - targetStats.defense);
            target.hp = Math.max(0, target.hp - damage);
            attacker.hasActed = true;

            if (target.hp <= 0) {
                this.state.units.delete(target.unitId);
                this._checkWinCondition();
            }
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
        for (let i = this._turnOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._turnOrder[i], this._turnOrder[j]] = [this._turnOrder[j]!, this._turnOrder[i]!];
        }
        this._spawnUnits();
        this.state.phase = "active";
        this.state.currentTurnId = this._turnOrder[0] ?? "";
        console.log(`[GameRoom] Game started. First turn: ${this.state.currentTurnId}`);
    }

    private _spawnUnits(): void {
        const playerList = [...this.state.players.values()];
        playerList.forEach((player, playerIdx) => {
            const roster = FACTION_ROSTERS[player.faction] ?? FACTION_ROSTERS["castle"]!;
            const positions = SIDE_POSITIONS[playerIdx % 4]!;
            roster.forEach((unitType, i) => {
                const stats = UNIT_STATS[unitType]!;
                const pos = positions[i]!;
                const unit = new GameUnit();
                unit.unitId = `${player.sessionId}:${i}`;
                unit.ownerId = player.sessionId;
                unit.unitType = unitType;
                unit.x = pos.x;
                unit.y = pos.y;
                unit.hp = stats.hp;
                unit.maxHp = stats.hp;
                this.state.units.set(unit.unitId, unit);
            });
        });
    }

    private _isCurrentTurn(client: Client): boolean {
        return this.state.phase === "active" && this.state.currentTurnId === client.sessionId;
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

        console.log(`[GameRoom] Turn advanced to ${this.state.currentTurnId}`);
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
