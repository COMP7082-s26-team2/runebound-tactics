import { GameComponent, World } from "@/lib/engine";
import { MultiplayerSelectionSystem } from "./MultiplayerSelectionSystem";

/**
 * Renders crisp outlines around targetable enemy units AFTER unit sprites.
 *
 * Lives at zIndex=3 (above UnitRenderSystem at zIndex=2). The fill overlays
 * on enemy cells live in `MovementRangeRenderSystem` (zIndex=1) under the
 * unit sprites; the outlines have to render on top so the sprite doesn't
 * cover the border.
 *
 * Two outline styles:
 *   - state === "selected": all `attackableEnemies` → orange outline
 *   - state === "awaiting-attack-target": only `pendingTargetCandidates` →
 *     bright yellow, thicker; signals "click to attack this one"
 */
export class EnemyTargetOutlineSystem implements GameComponent {
    readonly zIndex = 3; // above units

    constructor(
        private _world: World,
        private _cellSize: number,
        private _selection: MultiplayerSelectionSystem,
    ) {}

    draw(ctx: CanvasRenderingContext2D): void {
        const state = this._selection.selectionState;
        if (state === "idle") return;

        if (state === "selected") {
            this._outlineEnemies(
                ctx,
                this._selection.attackableEnemies,
                "rgba(255, 140, 0, 0.95)",
                3,
            );
            return;
        }

        if (state === "awaiting-attack-target") {
            this._outlineEnemies(
                ctx,
                this._selection.pendingTargetCandidates,
                "rgba(255, 215, 50, 1.0)",
                4,
            );
        }
    }

    private _outlineEnemies(
        ctx: CanvasRenderingContext2D,
        enemyServerIds: ReadonlySet<string>,
        strokeStyle: string,
        lineWidth: number,
    ): void {
        if (enemyServerIds.size === 0) return;

        ctx.save();
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        const inset = lineWidth / 2;

        for (const serverId of enemyServerIds) {
            const entityId = this._world.getEntityByServerId(serverId);
            if (entityId === undefined) continue;
            const coord = this._world.gridPositions.get(entityId);
            if (!coord) continue;

            ctx.strokeRect(
                coord.q * this._cellSize + inset,
                coord.r * this._cellSize + inset,
                this._cellSize - lineWidth,
                this._cellSize - lineWidth,
            );
        }

        ctx.restore();
    }
}
