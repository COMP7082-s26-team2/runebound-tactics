import type { GameComponent } from "@/lib/engine/core/GameComponent";
import type { World } from "@/lib/engine/world/World";
import type EventBus from "@/lib/engine/EventBus";
import { token } from "@/lib/theme/tokens";

interface FlashEntry {
    entityId: number;
    framesLeft: number;
}

export class TileFlashSystem implements GameComponent {
    readonly zIndex = 4;

    private _flashes: FlashEntry[] = [];
    private _brass: string;
    private _reducedMotion: boolean;

    constructor(
        private _world: World,
        private _eventBus: EventBus,
        private _cellSize: number,
    ) {
        this._brass = token("brass-500");
        this._reducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    init(): void {
        this._eventBus.on("combat:damage", (data: unknown) => {
            const { unitId } = data as { unitId: string };
            if (this._reducedMotion) return;
            const entityId = this._world.getEntityByServerId(unitId);
            if (entityId === undefined) return;
            const existing = this._flashes.find(
                (f) => f.entityId === entityId,
            );
            if (existing) {
                existing.framesLeft = 4;
            } else {
                this._flashes.push({ entityId, framesLeft: 4 });
            }
        });
    }

    update(_dt: number): void {
        for (const f of this._flashes) {
            f.framesLeft--;
        }
        this._flashes = this._flashes.filter((f) => f.framesLeft > 0);
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this._flashes.length === 0) return;
        ctx.save();
        ctx.strokeStyle = this._brass;
        ctx.lineWidth = 2;
        for (const f of this._flashes) {
            const coord = this._world.gridPositions.get(f.entityId);
            if (!coord) continue;
            ctx.strokeRect(
                coord.q * this._cellSize + 1,
                coord.r * this._cellSize + 1,
                this._cellSize - 2,
                this._cellSize - 2,
            );
        }
        ctx.restore();
    }
}
