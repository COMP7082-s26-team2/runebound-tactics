import type { GameComponent } from "@/lib/engine/core/GameComponent";
import type { World } from "@/lib/engine/world/World";
import type EventBus from "@/lib/engine/EventBus";
import { token, getFontFamily } from "@/lib/theme/tokens";

const STD_DURATION_MS = 600;
const LETHAL_EXTRA_MS = 400;
const RISE_PX = 18;
const MAX_FLOATS_PER_UNIT = 5;
const STAGGER_PX = 8;

// 4 motion steps: frame index → {yOffset, opacity}
const MOTION_STEPS = [
    { yOffset: 0, opacity: 1.0 },
    { yOffset: 6, opacity: 1.0 },
    { yOffset: 12, opacity: 0.66 },
    { yOffset: RISE_PX, opacity: 0.33 },
];

interface FloatEntry {
    serverId: string;
    amount: number;
    effective: boolean;
    lethal: boolean;
    elapsedMs: number;
    totalMs: number;
    spawnCx: number;
    spawnCy: number;
    stackSlot: number;
}

// Tracks how many concurrent floats are active per unit for slot assignment
const _activeSlots = new Map<string, Set<number>>();

function _claimSlot(serverId: string): number {
    let slots = _activeSlots.get(serverId);
    if (!slots) {
        slots = new Set();
        _activeSlots.set(serverId, slots);
    }
    for (let i = 0; i < MAX_FLOATS_PER_UNIT; i++) {
        if (!slots.has(i)) {
            slots.add(i);
            return i;
        }
    }
    return 0;
}

function _releaseSlot(serverId: string, slot: number): void {
    _activeSlots.get(serverId)?.delete(slot);
}

export class DamageNumberSystem implements GameComponent {
    readonly zIndex = 6;

    private _floats: FloatEntry[] = [];
    private _sealRed: string;
    private _white: string;
    private _font: string;
    private _reducedMotion: boolean;

    constructor(
        private _world: World,
        private _eventBus: EventBus,
        private _cellSize: number,
    ) {
        this._sealRed = token("seal-red");
        this._white = token("vellum-050");
        this._font = getFontFamily("font-pixelify");
        this._reducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    init(): void {
        this._eventBus.on("combat:damage", (data: unknown) => {
            const { unitId, amount, newHp, effective } = data as {
                unitId: string;
                amount: number;
                newHp: number;
                effective: boolean;
            };
            const entityId = this._world.getEntityByServerId(unitId);
            if (entityId === undefined) return;
            const coord = this._world.gridPositions.get(entityId);
            if (!coord) return;

            if (
                this._floats.filter((f) => f.serverId === unitId).length >=
                MAX_FLOATS_PER_UNIT
            )
                return;

            const lethal = newHp <= 0;
            const totalMs =
                STD_DURATION_MS + (lethal ? LETHAL_EXTRA_MS : 0);
            const slot = _claimSlot(unitId);
            const staggerX = (slot % 3) * STAGGER_PX * (slot % 2 === 0 ? 1 : -1);

            this._floats.push({
                serverId: unitId,
                amount,
                effective,
                lethal,
                elapsedMs: 0,
                totalMs,
                spawnCx:
                    coord.q * this._cellSize +
                    this._cellSize / 2 +
                    staggerX,
                spawnCy: coord.r * this._cellSize - 8, // aligns with health bar top (BAR_Y_OFFSET)
                stackSlot: slot,
            });
        });
    }

    update(dt: number): void {
        const dtMs = dt * 1000;
        this._floats = this._floats.filter((f) => {
            f.elapsedMs += dtMs;
            if (f.elapsedMs >= f.totalMs) {
                _releaseSlot(f.serverId, f.stackSlot);
                return false;
            }
            return true;
        });
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this._floats.length === 0) return;

        ctx.save();
        ctx.textAlign = "center";

        for (const f of this._floats) {
            const { yOffset, opacity } = this._interpolate(f);
            const text = `${f.lethal ? "✕" : "-"}${f.amount}`;
            const fontSize = f.lethal ? 18 : 14;

            ctx.globalAlpha = opacity;
            ctx.fillStyle = f.effective ? this._sealRed : this._white;
            ctx.font = `bold ${fontSize}px ${this._font}`;
            ctx.fillText(text, f.spawnCx, f.spawnCy - yOffset);
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    private _interpolate(f: FloatEntry): { yOffset: number; opacity: number } {
        if (this._reducedMotion) {
            // Instant — hold at spawn position, full opacity
            return { yOffset: 0, opacity: 1 };
        }

        // Lethal has an extra hold period at the start before motion begins
        const motionElapsed = f.lethal
            ? Math.max(0, f.elapsedMs - LETHAL_EXTRA_MS)
            : f.elapsedMs;
        const motionDuration = STD_DURATION_MS;
        const t = Math.min(1, motionElapsed / motionDuration);
        const stepIndex = Math.min(
            MOTION_STEPS.length - 1,
            Math.floor(t * MOTION_STEPS.length),
        );
        return MOTION_STEPS[stepIndex]!;
    }
}
