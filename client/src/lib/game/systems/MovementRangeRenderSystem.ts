import { GameComponent, World } from "@/lib/engine";
import { MultiplayerSelectionSystem } from "./MultiplayerSelectionSystem";

/**
 * Multiplayer-side movement range + attack range renderer.
 *
 * Reads highlights from a `MultiplayerSelectionSystem` (which holds the
 * shared `selectionMachine` context). Stays separate from the existing
 * `MovementRangeSystem` (which reads from `ClientGameState`) so the
 * singleplayer scratchpad keeps working unchanged.
 *
 * Overlay rules (attack-targeting design v1.1):
 *
 *   state ∈ {selected, awaiting-attack-target}:
 *     - Reachable tiles (blue)  = reachableTiles \ attackFromPositions
 *     - Attack-from tiles (green) = attackFromPositions (INCLUDES attacker's
 *                                    own tile when adjacent to ≥1 enemy)
 *     - Selected unit outline (yellow)
 *
 *   state === "selected":
 *     - Attackable enemies (red fill + orange border)
 *
 *   state === "awaiting-attack-target":
 *     - Pending attack-from (cyan border on the single chosen tile)
 *     - Pending target candidates (red pulse / bright red fill)
 */
export class MovementRangeRenderSystem implements GameComponent {
    readonly zIndex = 1; // above grid, below units

    constructor(
        private _world: World,
        private _cellSize: number,
        private _selection: MultiplayerSelectionSystem,
    ) {}

    draw(ctx: CanvasRenderingContext2D): void {
        const state = this._selection.selectionState;
        if (state === "idle") return;

        const reachable = this._selection.reachableTiles;
        const attackFrom = this._selection.attackFromPositions;

        // Blue fill for reachable tiles that are NOT attack-from positions
        ctx.fillStyle = "rgba(100, 149, 237, 0.4)";
        for (const key of reachable) {
            if (attackFrom.has(key)) continue;
            const [q, r] = key.split(",").map(Number);
            ctx.fillRect(
                q! * this._cellSize,
                r! * this._cellSize,
                this._cellSize,
                this._cellSize,
            );
        }

        // Green fill for attack-from positions (includes attacker's own tile)
        ctx.fillStyle = "rgba(0, 180, 70, 0.45)";
        for (const key of attackFrom) {
            const [q, r] = key.split(",").map(Number);
            ctx.fillRect(
                q! * this._cellSize,
                r! * this._cellSize,
                this._cellSize,
                this._cellSize,
            );
        }

        // Red fill on attackable enemies — only in "selected" (before commit)
        if (state === "selected") {
            ctx.save();
            ctx.fillStyle = "rgba(220, 50, 50, 0.4)";
            ctx.strokeStyle = "rgba(255, 140, 0, 0.95)";
            ctx.lineWidth = 3;
            for (const enemyServerId of this._selection.attackableEnemies) {
                const entityId =
                    this._world.getEntityByServerId(enemyServerId);
                if (entityId === undefined) continue;
                const coord = this._world.gridPositions.get(entityId);
                if (!coord) continue;
                ctx.fillRect(
                    coord.q * this._cellSize,
                    coord.r * this._cellSize,
                    this._cellSize,
                    this._cellSize,
                );
                ctx.strokeRect(
                    coord.q * this._cellSize + 1.5,
                    coord.r * this._cellSize + 1.5,
                    this._cellSize - 3,
                    this._cellSize - 3,
                );
            }
            ctx.restore();
        }

        // Awaiting-attack-target overlays
        if (state === "awaiting-attack-target") {
            const pendingFrom = this._selection.pendingAttackFrom;
            if (pendingFrom) {
                const [q, r] = pendingFrom.split(",").map(Number);
                ctx.save();
                ctx.strokeStyle = "rgba(0, 220, 255, 0.95)";
                ctx.lineWidth = 4;
                ctx.strokeRect(
                    q! * this._cellSize + 2,
                    r! * this._cellSize + 2,
                    this._cellSize - 4,
                    this._cellSize - 4,
                );
                ctx.restore();
            }

            // Target candidates — brighter red fill
            ctx.save();
            ctx.fillStyle = "rgba(255, 60, 60, 0.55)";
            ctx.strokeStyle = "rgba(255, 200, 50, 0.95)";
            ctx.lineWidth = 3;
            for (const enemyServerId of this._selection
                .pendingTargetCandidates) {
                const entityId =
                    this._world.getEntityByServerId(enemyServerId);
                if (entityId === undefined) continue;
                const coord = this._world.gridPositions.get(entityId);
                if (!coord) continue;
                ctx.fillRect(
                    coord.q * this._cellSize,
                    coord.r * this._cellSize,
                    this._cellSize,
                    this._cellSize,
                );
                ctx.strokeRect(
                    coord.q * this._cellSize + 1.5,
                    coord.r * this._cellSize + 1.5,
                    this._cellSize - 3,
                    this._cellSize - 3,
                );
            }
            ctx.restore();
        }

        // Yellow outline on the selected unit (drawn last so it tops green fill)
        const serverId = this._selection.selectedUnitId;
        if (!serverId) return;
        const entityId = this._world.getEntityByServerId(serverId);
        if (entityId === undefined) return;
        const coord = this._world.gridPositions.get(entityId);
        if (!coord) return;

        ctx.save();
        ctx.strokeStyle = "rgba(255, 230, 50, 0.95)";
        ctx.lineWidth = 3;
        ctx.strokeRect(
            coord.q * this._cellSize + 1.5,
            coord.r * this._cellSize + 1.5,
            this._cellSize - 3,
            this._cellSize - 3,
        );
        ctx.restore();
    }
}
