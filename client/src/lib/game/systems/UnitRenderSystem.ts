import { World, GameComponent, TweenManager, AssetHandler, SpriteSheetDefinition, AnimationState, AnimationController } from "@/lib/engine";

/**
 * Resolves the row index for an animation state.
 * If the state is not found in the rowMap, falls back to "attack" and logs a warning.
 */
function resolveRow(
    sheet: SpriteSheetDefinition,
    state: AnimationState,
    assetKey: string
): number {
    const row = sheet.rowMap[state];
    if (row !== undefined) return row;

    console.warn(
        `[AssetHandler] AnimationState "${state}" not found in rowMap for "${assetKey}". Falling back to "attack".`
    );
    return sheet.rowMap["attack"] ?? 2; // attack is always row 2 by convention
}

export class UnitRenderSystem implements GameComponent {
    readonly zIndex = 2; // above grid (0) and movement highlights (1)

    constructor(
        private _world: World,
        private _gridCols: number,
        private _gridRows: number,
        private _cellSize: number,
        private _tweens?: TweenManager,
        private _assetHandler?: AssetHandler,
        private _animationController?: AnimationController,
    ) { }

    update() {
        if (!this._tweens) return;

        for (const [, entityId] of this._world.occupancyMap.entries()) {
            const appearance = this._world.unitAppearance.get(entityId);
            if (!appearance) continue;

            const tweenDirection = this._tweens.getDirection(entityId);
            if (tweenDirection && tweenDirection.x !== 0) {
                appearance.facingLeft = tweenDirection.x < 0;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        for (const [, entityId] of this._world.occupancyMap.entries()) {
            const coord = this._world.gridPositions.get(entityId);
            if (!coord) continue;

            const fallback = this._world.grid.gridToWorld(coord);
            const { x, y } = this._tweens
                ? this._tweens.getPosition(entityId, fallback)
                : fallback;

            const appearance = this._world.unitAppearance.get(entityId);
            if (!appearance) continue;

            const { assetKey, animationState, facingLeft, color, exhausted, alpha, scale } = appearance;
            const tweenDirection = this._tweens?.getDirection(entityId);
            const effectiveFacingLeft = tweenDirection && tweenDirection.x !== 0
                ? tweenDirection.x < 0
                : facingLeft;

            const exhaustedFilter = exhausted
                ? "grayscale(100%) brightness(0.6)"
                : "none";

            // Skip render entirely when fully faded out (FadeStep death fallback).
            if (alpha !== undefined && alpha <= 0) continue;

            // Try to render sprite if asset handler and asset are available
            if (assetKey && this._assetHandler && this._assetHandler.has(assetKey)) {
                const img = this._assetHandler.get(assetKey);
                const sheet = this._assetHandler.getSpriteSheet(assetKey);

                if (sheet) {
                    const row = resolveRow(sheet, animationState, assetKey);
                    const frameIndex = this._animationController?.getFrameIndex(entityId) ?? 0;
                    const sx = frameIndex * sheet.frameWidth;
                    const sy = row * sheet.frameHeight;
                    const sw = sheet.frameWidth;
                    const sh = sheet.frameHeight;

                    ctx.save();
                    ctx.filter = exhaustedFilter;
                    if (sheet.pixelPerfect) {
                        ctx.imageSmoothingEnabled = false;
                    }
                    if (alpha !== undefined && alpha !== 1) {
                        ctx.globalAlpha *= alpha;
                    }
                    if (scale !== undefined && scale !== 1) {
                        // Scale around the cell center so the sprite shrinks in place.
                        const cx = x + this._cellSize / 2;
                        const cy = y + this._cellSize / 2;
                        ctx.translate(cx, cy);
                        ctx.scale(scale, scale);
                        ctx.translate(-cx, -cy);
                    }

                    if (effectiveFacingLeft) {
                        ctx.scale(-1, 1);
                        ctx.drawImage(img, sx, sy, sw, sh, -(x + this._cellSize), y, this._cellSize, this._cellSize);
                    } else {
                        ctx.drawImage(img, sx, sy, sw, sh, x, y, this._cellSize, this._cellSize);
                    }
                    ctx.restore();
                } else {
                    // Fallback to color if sprite sheet definition is missing
                    ctx.save();
                    if (alpha !== undefined && alpha !== 1) ctx.globalAlpha *= alpha;
                    ctx.fillStyle = exhausted ? "#666" : (color ?? "gray");
                    ctx.fillRect(x, y, this._cellSize, this._cellSize);
                    ctx.restore();
                }
            } else {
                // Fallback to colored rectangle if no asset or handler
                ctx.save();
                if (alpha !== undefined && alpha !== 1) ctx.globalAlpha *= alpha;
                ctx.fillStyle = exhausted ? "#666" : (color ?? "gray");
                ctx.fillRect(x, y, this._cellSize, this._cellSize);
                ctx.restore();
            }
        }
    }
}
