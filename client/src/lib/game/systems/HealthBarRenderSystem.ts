import type { GameComponent } from "@/lib/engine/core/GameComponent";
import type { World } from "@/lib/engine/world/World";
import type { InputSystem } from "@/lib/game/systems/InputSystem";
import type EventBus from "@/lib/engine/EventBus";
import { TweenManager, Vector2D } from "@/lib/engine";
import { token } from "@/lib/theme/tokens";

const HOLD_MS = 1500;
const FADE_MS = 200;
const FADE_STEPS = 5;
const BAR_H = 4;
const BAR_Y_OFFSET = 8;

// Stepped opacity levels for fade-out (index 0 = fully visible, 4 = gone)
const FADE_OPACITY = [1, 0.75, 0.5, 0.25, 0];

type BarState = "hidden" | "visible" | "hold" | "fading";

interface BarEntry {
    serverId: string;
    currentHp: number;
    maxHp: number;
    faction: string;
    state: BarState;
    holdMs: number;
    fadeProgress: number;
    hoverActive: boolean;
}

export class HealthBarRenderSystem implements GameComponent {
    readonly zIndex = 5;

    private _bars = new Map<string, BarEntry>();
    private _prevHoveredServerId: string | null = null;
    private _reducedMotion: boolean;

    // Token colors resolved once at construction
    private _trough: string;
    private _border: string;
    private _bevel: string;
    private _hoverBorder: string;
    private _castle: string;
    private _necro: string;
    private _fallback: string;

    constructor(
        private _world: World,
        private _input: InputSystem,
        private _eventBus: EventBus,
        private _lastSeenHp: ReadonlyMap<string, number>,
        private _getFaction: (ownerId: string) => string,
        private _cellSize: number,
        private _tweens: TweenManager,
    ) {
        this._reducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        this._trough = token("ink-700");
        this._border = token("ink-900");
        this._bevel = token("ink-500");
        this._hoverBorder = token("brass-500");
        this._castle = token("castle-ink");
        this._necro = token("necro-ink");
        this._fallback = token("brass-300");
    }

    init(): void {
        this._eventBus.on("combat:damage", (data: unknown) => {
            const { unitId, newHp } = data as { unitId: string; newHp: number };
            const entry = this._getOrCreate(unitId);
            if (!entry) return;
            entry.currentHp = newHp;
            entry.state = "hold";
            entry.holdMs = HOLD_MS;
            entry.fadeProgress = 0;
        });

        this._eventBus.on("unit:despawn", (data: unknown) => {
            const { unitId } = data as { unitId: string };
            this._bars.delete(unitId);
        });
    }

    update(dt: number): void {
        const dtMs = dt * 1000;

        // ── Hover detection ──────────────────────────────────────────────
        const mx = this._input.mouseX;
        const my = this._input.mouseY;
        const col = Math.floor(mx / this._cellSize);
        const row = Math.floor(my / this._cellSize);
        const key = `${col},${row}`;
        const hoveredEntityId = this._world.occupancyMap.get(key);
        const hoveredServerId =
            hoveredEntityId !== undefined
                ? (this._world.getServerIdByEntity(hoveredEntityId) ?? null)
                : null;

        if (hoveredServerId !== this._prevHoveredServerId) {
            // Leave previous
            if (this._prevHoveredServerId !== null) {
                const prev = this._bars.get(this._prevHoveredServerId);
                if (prev) {
                    prev.hoverActive = false;
                    if (prev.state === "visible") {
                        prev.state = "hold";
                        prev.holdMs = HOLD_MS;
                    }
                }
            }
            // Enter new
            if (hoveredServerId !== null) {
                const entry = this._getOrCreate(hoveredServerId);
                if (entry) {
                    entry.hoverActive = true;
                    entry.state = "visible";
                    entry.fadeProgress = 0;
                }
            }
            this._prevHoveredServerId = hoveredServerId;
        }

        // ── Tick each bar state ──────────────────────────────────────────
        for (const entry of this._bars.values()) {
            if (entry.state === "hidden") continue;

            if (entry.state === "hold") {
                entry.holdMs -= dtMs;
                if (entry.holdMs <= 0) {
                    if (this._reducedMotion) {
                        entry.state = "hidden";
                    } else {
                        entry.state = "fading";
                        entry.fadeProgress = 0;
                    }
                }
            } else if (entry.state === "fading") {
                entry.fadeProgress += dtMs / FADE_MS;
                if (entry.fadeProgress >= 1) {
                    entry.state = "hidden";
                    entry.fadeProgress = 0;
                }
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        for (const [serverId, entry] of this._bars) {
            if (entry.state === "hidden") continue;

            const entityId = this._world.getEntityByServerId(serverId);
            if (entityId === undefined) continue;
            const coord = this._world.gridPositions.get(entityId);
            if (!coord) continue;

            const opacity = this._opacity(entry);
            const barW = this._cellSize - 4;
            const fallback = Vector2D.of(
                coord.q * this._cellSize,
                coord.r * this._cellSize,
            );
            const { x: px, y: py } = this._tweens.getPosition(entityId, fallback);
            const barX = px + 2;
            const barY = py - BAR_Y_OFFSET;
            const fillW =
                entry.maxHp > 0
                    ? Math.max(
                          0,
                          Math.round((entry.currentHp / entry.maxHp) * barW),
                      )
                    : 0;

            ctx.save();
            ctx.globalAlpha = opacity;

            // Outer border — brass-500 on hover, ink-900 otherwise
            ctx.fillStyle = entry.hoverActive
                ? this._hoverBorder
                : this._border;
            ctx.fillRect(barX - 1, barY - 1, barW + 2, BAR_H + 2);

            // Trough
            ctx.fillStyle = this._trough;
            ctx.fillRect(barX, barY, barW, BAR_H);

            // Fill
            if (fillW > 0) {
                ctx.fillStyle = this._factionColor(entry.faction);
                ctx.fillRect(barX, barY, fillW, BAR_H);
            }

            // Top bevel highlight
            ctx.fillStyle = this._bevel;
            ctx.fillRect(barX, barY, barW, 1);

            ctx.restore();
        }
    }

    private _getOrCreate(serverId: string): BarEntry | null {
        if (this._bars.has(serverId)) return this._bars.get(serverId)!;

        const entityId = this._world.getEntityByServerId(serverId);
        if (entityId === undefined) return null;

        const stats = this._world.unitStats.get(entityId);
        const maxHp = stats?.health ?? 1;
        const currentHp = this._lastSeenHp.get(serverId) ?? maxHp;

        const ownerId = this._world.unitOwnership.get(entityId) ?? "";
        const faction = this._getFaction(ownerId);

        const entry: BarEntry = {
            serverId,
            currentHp,
            maxHp,
            faction,
            state: "hidden",
            holdMs: 0,
            fadeProgress: 0,
            hoverActive: false,
        };
        this._bars.set(serverId, entry);
        return entry;
    }

    private _opacity(entry: BarEntry): number {
        if (entry.state !== "fading") return 1;
        const step = Math.min(
            FADE_STEPS - 1,
            Math.floor(entry.fadeProgress * FADE_STEPS),
        );
        return FADE_OPACITY[step] ?? 0;
    }

    private _factionColor(faction: string): string {
        if (faction === "castle") return this._castle;
        if (faction === "necropolis") return this._necro;
        return this._fallback;
    }
}
