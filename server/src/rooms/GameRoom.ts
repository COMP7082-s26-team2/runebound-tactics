import { Room, Client } from "colyseus";
import { GamePlayerSlot, GameState } from "@runebound-tactics/shared";
import type { Faction } from "@runebound-tactics/shared";
import { pendingGames } from "./pendingGames";
import prisma from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase";

interface PendingPlayer {
    displayName: string;
    faction: string;
}

interface GameRoomOptions {
    lobbyRoomId: string;
}

interface JoinOptions {
    displayName?: string;
    token?: string;
    reconnectionToken?: string;
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

    async onAuth(_client: Client, options: JoinOptions) {
        if (options.reconnectionToken) {
            return true;
        }

        if (!options.token) {
            throw new Error("No auth token provided");
        }

        const { data: { user }, error } = await supabaseAdmin.auth.getUser(options.token);
        if (error || !user) {
            throw new Error("Invalid or expired auth token");
        }

        const player = await prisma.player.findUnique({
            where: { auth_id: user.id },
            select: { player_id: true, username: true },
        });

        if (!player) {
            throw new Error("Player profile not found");
        }

        return player;
    }

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

            // TODO: validate movement range against game rules design
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

            // TODO: apply damage formula from combat design
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
        const authUsername = typeof client.auth === "object" && client.auth !== null
            ? (client.auth as { username?: string | null }).username ?? undefined
            : undefined;
        const displayName = String(options?.displayName ?? authUsername ?? "Player").slice(0, 32);
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
        console.log(
            `[GameRoom] Game started. First turn: ${this.state.currentTurnId}`,
        );
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
