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
    private static readonly OUTLINE = 2;
    private _offCanvas: HTMLCanvasElement | null = null;
    private _offCtx: CanvasRenderingContext2D | null = null;

    constructor(
        private _world: World,
        private _gridCols: number,
        private _gridRows: number,
        private _cellSize: number,
        private _tweens?: TweenManager,
        private _assetHandler?: AssetHandler,
        private _animationController?: AnimationController,
    ) { }

    init(): void {
        const pad = UnitRenderSystem.OUTLINE;
        this._offCanvas = document.createElement("canvas");
        this._offCanvas.width = this._cellSize + pad * 2;
        this._offCanvas.height = this._cellSize + pad * 2;
        this._offCtx = this._offCanvas.getContext("2d") ?? null;
    }

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

            const { assetKey, animationState, facingLeft, color, outlineColor } = appearance;
            const tweenDirection = this._tweens?.getDirection(entityId);
            const effectiveFacingLeft = tweenDirection && tweenDirection.x !== 0
                ? tweenDirection.x < 0
                : facingLeft;

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

                    // Disable image smoothing for pixel-perfect rendering if enabled
                    const smoothingWasEnabled = ctx.imageSmoothingEnabled;
                    if (sheet.pixelPerfect) {
                        ctx.imageSmoothingEnabled = false;
                    }

                    if (effectiveFacingLeft) {
                        ctx.save();
                        ctx.scale(-1, 1);
                        if (outlineColor) {
                            this._drawOutline(ctx, img, sx, sy, sw, sh, -(x + this._cellSize), y, outlineColor);
                        }
                        ctx.drawImage(img, sx, sy, sw, sh, -(x + this._cellSize), y, this._cellSize, this._cellSize);
                        ctx.restore();
                    } else {
                        if (outlineColor) {
                            this._drawOutline(ctx, img, sx, sy, sw, sh, x, y, outlineColor);
                        }
                        ctx.drawImage(img, sx, sy, sw, sh, x, y, this._cellSize, this._cellSize);
                    }

                    // Restore image smoothing state
                    ctx.imageSmoothingEnabled = smoothingWasEnabled;
                } else {
                    // Fallback to color if sprite sheet definition is missing
                    ctx.fillStyle = color ?? "gray";
                    ctx.fillRect(x, y, this._cellSize, this._cellSize);
                }
            } else {
                // Fallback to colored rectangle if no asset or handler
                ctx.fillStyle = color ?? "gray";
                ctx.fillRect(x, y, this._cellSize, this._cellSize);
            }
        }
    }

    private _drawOutline(
        ctx: CanvasRenderingContext2D,
        img: HTMLImageElement,
        sx: number, sy: number, sw: number, sh: number,
        x: number, y: number,
        color: string,
    ): void {
        if (!this._offCanvas || !this._offCtx) return;
        const pad = UnitRenderSystem.OUTLINE;
        const off = this._offCtx;

        off.clearRect(0, 0, this._offCanvas.width, this._offCanvas.height);
        off.imageSmoothingEnabled = false;
        off.drawImage(img, sx, sy, sw, sh, pad, pad, this._cellSize, this._cellSize);

        off.globalCompositeOperation = "source-in";
        off.fillStyle = color;
        off.fillRect(0, 0, this._offCanvas.width, this._offCanvas.height);
        off.globalCompositeOperation = "source-over";

        const offsets: [number, number][] = [
            [-1, -1], [0, -1], [1, -1],
            [-1,  0],          [1,  0],
            [-1,  1], [0,  1], [1,  1],
        ];
        for (const [dx, dy] of offsets) {
            ctx.drawImage(this._offCanvas, x - pad + dx, y - pad + dy);
        }
    }
}
