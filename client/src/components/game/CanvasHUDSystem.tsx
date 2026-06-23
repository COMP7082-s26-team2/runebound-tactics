"use client";

import type { GameState } from "@runebound-tactics/shared";
import { token, getFontFamily } from "@/lib/theme/tokens";

const CANVAS_W = 1300;
const CANVAS_H = 880;
const BOARD_W = 800;
const BOARD_H = 800;
const LEFT_COL_W = 240;
const LEFT_COL_X = 0;
const BOARD_X = LEFT_COL_W + 10;            // 250
const SIDEBAR_X = BOARD_X + BOARD_W + 10;   // 1060
const SIDEBAR_W = CANVAS_W - SIDEBAR_X;     // 240
const STRIP_Y = BOARD_H + 10;               // 810
const STRIP_H = CANVAS_H - STRIP_Y - 10;    // 60

// Sidebar box dims (right column)
const TACT_Y = 0;
const TACT_H = 130;
const STATS_Y = TACT_H + 10;
const STATS_H = 260;
const GSTATUS_Y = STATS_Y + STATS_H + 10;
const GSTATUS_H = 260;
const COMBAT_Y = GSTATUS_Y + GSTATUS_H + 10;
const COMBAT_H = BOARD_H - COMBAT_Y;

interface ResolvedTheme {
    ink900: string;
    ink800: string;
    ink700: string;
    ink500: string;
    ink300: string;
    vellum050: string;
    inkFaded: string;
    inkMark: string;
    brass500: string;
    brass300: string;
    brass700: string;
    sealRed: string;
    sealWarning: string;
    fontPixelify: string;
    fontTiny5: string;
}

function resolveTheme(): ResolvedTheme {
    return {
        ink900: token("ink-900"),
        ink800: token("ink-800"),
        ink700: token("ink-700"),
        ink500: token("ink-500"),
        ink300: token("ink-300"),
        vellum050: token("vellum-050"),
        inkFaded: token("ink-faded"),
        inkMark: token("ink-mark"),
        brass500: token("brass-500"),
        brass300: token("brass-300"),
        brass700: token("brass-700"),
        sealRed: token("seal-red"),
        sealWarning: token("seal-warning"),
        fontPixelify: getFontFamily("font-pixelify"),
        fontTiny5: getFontFamily("font-tiny5"),
    };
}

export interface HitRegion {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export class CanvasHUDSystem {
    private theme: ResolvedTheme;
    private hitRegions: HitRegion[] = [];

    constructor() {
        this.theme = resolveTheme();
    }

    /**
     * Re-resolve theme tokens. Call after fonts/CSS are guaranteed loaded.
     */
    refreshTheme(): void {
        this.theme = resolveTheme();
    }

    /**
     * Returns the canvas-space hit regions registered during the most recent
     * `draw()` call. Consumers route pointer events through this list.
     */
    getHitRegions(): ReadonlyArray<HitRegion> {
        return this.hitRegions;
    }

    private addHitRegion(id: string, x: number, y: number, w: number, h: number): void {
        this.hitRegions.push({ id, x, y, w, h });
    }

    draw(ctx: CanvasRenderingContext2D, state: GameState | undefined, sessionId: string): void {
        this.hitRegions = []; // reset every frame

        this.drawLeftColumn(ctx, state, sessionId);
        this.drawTactician(ctx, state, sessionId);
        this.drawUnitStats(ctx);  // placeholder for foundation slice
        this.drawGameStatus(ctx, state, sessionId);
        this.drawCombatBar(ctx);
        this.drawReactionStrip(ctx);
    }

    // ── Chamber bevel chrome ─────────────────────────────────────
    private drawBevelBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
        ctx.fillStyle = this.theme.ink700;
        ctx.fillRect(x, y, w, h);
        // top + left highlight
        ctx.fillStyle = this.theme.ink500;
        ctx.fillRect(x, y, w, 1);
        ctx.fillRect(x, y, 1, h);
        // bottom + right shadow
        ctx.fillStyle = this.theme.ink900;
        ctx.fillRect(x, y + h - 1, w, 1);
        ctx.fillRect(x + w - 1, y, 1, h);
    }

    private drawEyebrow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color?: string): void {
        ctx.fillStyle = color ?? this.theme.ink500;
        ctx.font = `12px ${this.theme.fontTiny5}, monospace`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(text.toUpperCase(), x, y);
    }

    private drawButton(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        label: string,
        intent: "primary" | "secondary",
        disabled: boolean,
    ): void {
        // Primary: brass-300 bg + black text + brass-700 border
        // Secondary: transparent bg + brass-500 border + brass-300 text
        // Disabled: ink-700 bg + ink-500 text + ink-500 border
        if (disabled) {
            ctx.fillStyle = this.theme.ink700;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = this.theme.ink500;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        } else if (intent === "primary") {
            ctx.fillStyle = this.theme.brass300;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = this.theme.brass700;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        } else {
            // secondary outline-brass
            ctx.strokeStyle = this.theme.brass500;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        }

        ctx.fillStyle = disabled
            ? this.theme.ink500
            : intent === "primary"
                ? "#000000"
                : this.theme.brass300;
        const fontSize = h >= 48 ? 18 : 14;
        ctx.font = `bold ${fontSize}px ${this.theme.fontPixelify}, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + w / 2, y + h / 2);

        ctx.textAlign = "left"; // reset
        ctx.lineWidth = 1;
    }

    // ── Left action column ───────────────────────────────────────
    private drawLeftColumn(
        ctx: CanvasRenderingContext2D,
        state: GameState | undefined,
        sessionId: string,
    ): void {
        const x = LEFT_COL_X;
        const colW = LEFT_COL_W;

        // Slot 1: Menu button row, top 60px
        const menuY = 12;
        const menuW = 80;
        const menuH = 32;
        const menuX = colW - menuW - 12; // right-aligned in column
        this.drawButton(ctx, menuX, menuY, menuW, menuH, "⚙ Menu", "secondary", false);
        this.addHitRegion("menu", menuX, menuY, menuW, menuH);

        // Slot 2: Actions panel
        const actionsY = 60;
        const actionsH = 180;
        this.drawBevelBox(ctx, x, actionsY, colW, actionsH);
        this.drawEyebrow(ctx, "Actions", x + 12, actionsY + 12, this.theme.brass500);

        const endTurnW = colW - 24;
        const endTurnH = 56;
        const endTurnX = x + 12;
        const endTurnY = actionsY + 40;

        const isMyTurn =
            state?.currentTurnId === sessionId && state?.phase === "active";
        this.drawButton(
            ctx,
            endTurnX,
            endTurnY,
            endTurnW,
            endTurnH,
            "END TURN",
            "primary",
            !isMyTurn,
        );
        if (isMyTurn) {
            this.addHitRegion("end_turn", endTurnX, endTurnY, endTurnW, endTurnH);
        }

        // Action Points placeholder eyebrow + value
        this.drawEyebrow(ctx, "Action Points · 1", x + 12, actionsY + actionsH - 22);

        // Slot 3: History feed
        const histY = actionsY + actionsH + 10;
        const histH = BOARD_H - histY;
        this.drawBevelBox(ctx, x, histY, colW, histH);
        this.drawEyebrow(ctx, "History", x + 12, histY + 12, this.theme.brass500);

        // Placeholder body
        ctx.fillStyle = this.theme.inkFaded;
        ctx.font = `14px ${this.theme.fontPixelify}, monospace`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("No events yet —", x + 12, histY + histH / 2 - 10);
        ctx.fillText("your move.", x + 12, histY + histH / 2 + 10);
    }

    // ── Right sidebar boxes ──────────────────────────────────────

    private drawTactician(ctx: CanvasRenderingContext2D, state: GameState | undefined, sessionId: string): void {
        const x = SIDEBAR_X;
        const y = TACT_Y;
        const w = SIDEBAR_W;
        const h = TACT_H;
        this.drawBevelBox(ctx, x, y, w, h);

        // Read local player from state
        const players = (state?.players ?? {}) as unknown as Record<
            string,
            { displayName: string; sessionId: string }
        >;
        const localPlayer = players[sessionId];
        const displayName = localPlayer?.displayName ?? "Unknown Tactician";

        this.drawEyebrow(ctx, "Tactician", x + 12, y + 12);

        ctx.fillStyle = this.theme.vellum050;
        ctx.font = `bold 22px ${this.theme.fontPixelify}, monospace`;
        ctx.textBaseline = "top";
        ctx.fillText(displayName, x + 12, y + 30);

        // brass underline
        ctx.fillStyle = this.theme.brass500;
        ctx.fillRect(x + 12, y + 60, 64, 1);

        // rank placeholder — Tiny5 caption
        this.drawEyebrow(ctx, "Rank · Diamond I", x + 12, y + h - 24);
    }

    private drawUnitStats(ctx: CanvasRenderingContext2D): void {
        const x = SIDEBAR_X;
        const y = STATS_Y;
        const w = SIDEBAR_W;
        const h = STATS_H;
        this.drawBevelBox(ctx, x, y, w, h);

        this.drawEyebrow(ctx, "Unit Stats", x + 12, y + 12, this.theme.brass500);

        // Placeholder for foundation slice — hover/select wiring comes in a later slice.
        ctx.fillStyle = this.theme.inkFaded;
        ctx.font = `16px ${this.theme.fontPixelify}, monospace`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("Select a unit to inspect.", x + 12, y + h / 2);
    }

    private drawGameStatus(ctx: CanvasRenderingContext2D, state: GameState | undefined, sessionId: string): void {
        const x = SIDEBAR_X;
        const y = GSTATUS_Y;
        const w = SIDEBAR_W;
        const h = GSTATUS_H;
        this.drawBevelBox(ctx, x, y, w, h);

        this.drawEyebrow(ctx, "Game Status", x + 12, y + 12, this.theme.brass500);

        if (!state) return;

        const phase = state.phase ?? "—";
        const turnNumber = state.turnNumber ?? 0;
        const players = state.players as unknown as Record<
            string,
            { displayName: string; sessionId: string }
        >;
        const active = players?.[state.currentTurnId ?? ""];
        const isMyTurn = state.currentTurnId === sessionId && state.phase === "active";

        // Render a stack of label/value rows
        const rows: Array<[string, string, string?]> = [
            ["Phase", phase.toUpperCase(), this.theme.vellum050],
            ["Turn", isMyTurn ? "Your turn" : (active?.displayName ?? "—"), this.theme.vellum050],
            ["Round", String(turnNumber + 1), this.theme.vellum050],
        ];

        let rowY = y + 40;
        for (const [label, value, valueColor] of rows) {
            this.drawEyebrow(ctx, label, x + 12, rowY);
            ctx.fillStyle = valueColor ?? this.theme.vellum050;
            ctx.font = `bold 16px ${this.theme.fontPixelify}, monospace`;
            ctx.textAlign = "right";
            ctx.textBaseline = "top";
            ctx.fillText(value, x + w - 12, rowY);
            rowY += 28;
        }

        ctx.textAlign = "left"; // reset
    }

    private drawCombatBar(ctx: CanvasRenderingContext2D): void {
        const x = SIDEBAR_X;
        const y = COMBAT_Y;
        const w = SIDEBAR_W;
        const h = COMBAT_H;
        this.drawBevelBox(ctx, x, y, w, h);

        // Two sub-regions: Deck (left) | Discard (right)
        const halfW = (w - 1) / 2;
        const deckX = x;
        const discX = x + halfW + 1;

        // Vertical divider
        ctx.fillStyle = this.theme.ink500;
        ctx.fillRect(x + halfW, y + 8, 1, h - 16);

        this.drawPilePlaceholder(ctx, deckX, y, halfW, h, "Deck", 0);
        this.drawPilePlaceholder(ctx, discX, y, halfW, h, "Discard", 0);
    }

    private drawPilePlaceholder(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        label: string,
        count: number,
    ): void {
        // Eyebrow
        this.drawEyebrow(ctx, label, x + w / 2 - 28, y + 10);

        // Glyph placeholder — 48×64 chamber bevel rectangle centered
        const gW = 48;
        const gH = 64;
        const gX = x + w / 2 - gW / 2;
        const gY = y + 28;

        // Dim if count === 0
        const dim = count === 0;
        ctx.globalAlpha = dim ? 0.3 : 1.0;

        // Card glyph: bevel box with a centered diamond sigil
        ctx.fillStyle = this.theme.ink800;
        ctx.fillRect(gX, gY, gW, gH);
        ctx.fillStyle = this.theme.ink500;
        ctx.fillRect(gX, gY, gW, 1);
        ctx.fillRect(gX, gY, 1, gH);
        ctx.fillStyle = this.theme.ink900;
        ctx.fillRect(gX, gY + gH - 1, gW, 1);
        ctx.fillRect(gX + gW - 1, gY, 1, gH);

        ctx.fillStyle = this.theme.brass500;
        ctx.font = `12px ${this.theme.fontPixelify}, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("◆", gX + gW / 2, gY + gH / 2);

        ctx.globalAlpha = 1.0;

        // Numeric count
        ctx.fillStyle = dim ? this.theme.ink500 : this.theme.brass500;
        ctx.font = `bold 14px ${this.theme.fontPixelify}, monospace`;
        ctx.fillText(String(count), x + w / 2, gY + gH + 14);

        ctx.textAlign = "left"; // reset
    }

    // ── Bottom Reaction Strip (idle state only for this slice) ───
    private drawReactionStrip(ctx: CanvasRenderingContext2D): void {
        const x = 0;
        const y = STRIP_Y;
        const w = CANVAS_W;
        const h = STRIP_H;
        this.drawBevelBox(ctx, x, y, w, h);

        // Idle: dim sigil centered
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.theme.brass500;
        ctx.font = `28px ${this.theme.fontPixelify}, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("◆", x + w / 2, y + h / 2);
        ctx.globalAlpha = 1.0;

        ctx.textAlign = "left"; // reset
    }
}
