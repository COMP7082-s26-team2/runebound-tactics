"use client";

import { useEffect, useRef, useState } from "react";
import { GameEngine, AssetHandler } from "@/lib/engine";
import { MultiplayerGameScene } from "@/lib/game/scenes/MultiplayerGameScene";
import { ASSET_MANIFEST } from "@/lib/game/assets";
import { type GameState } from "@runebound-tactics/shared";
import { CanvasHUDSystem } from "@/components/game/CanvasHUDSystem";
import type { Room } from "@colyseus/sdk";

export type HudAction = "menu" | "end_turn";

interface MultiplayerGameCanvasProps {
    room: Room<GameState>;
    state: GameState;
    onHudAction?: (action: HudAction) => void;
}

const CANVAS_WIDTH = 1300;
const CANVAS_HEIGHT = 880;
const BOARD_X = 250; // 240 left col + 10 gutter
const BOARD_Y = 0;
const BOARD_W = 800;
const BOARD_H = 800;

type LoadPhase = "loading" | "ready" | "error";

/**
 * Canvas wrapper: preloads sprite assets, then spins up GameEngine +
 * MultiplayerGameScene, then reconciles state on every Colyseus snapshot.
 *
 * Three lifecycle phases:
 *   1. `loading`  — AssetHandler.preload in flight; canvas hidden behind
 *                   overlay. Engine has not started.
 *   2. `ready`    — preload resolved; engine running; reconciles flow into
 *                   the scene on each state patch.
 *   3. `error`    — preload rejected (network / 404). Engine never starts.
 *
 * The asset handler is canvas-owned (created inside this effect, discarded on
 * unmount). Scene init is sync, so preload happens above the scene rather
 * than inside it.
 *
 * Layout: the scene draws inside a board region offset by (BOARD_X, BOARD_Y)
 * via `ctx.translate(...)` in `preDraw`. Scene-internal systems (grid, units,
 * highlights) all draw at logical (0,0) and inherit the offset. The HUD draws
 * in raw canvas-space after `ctx.restore()` so it sits outside the board clip.
 */
export function MultiplayerGameCanvas({ room, state, onHudAction }: MultiplayerGameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sceneRef = useRef<MultiplayerGameScene | null>(null);
    const latestStateRef = useRef<GameState>(state);
    const onHudActionRef = useRef<typeof onHudAction>(onHudAction);
    const [phase, setPhase] = useState<LoadPhase>("loading");

    useEffect(() => {
        latestStateRef.current = state;
    }, [state]);

    useEffect(() => {
        onHudActionRef.current = onHudAction;
    }, [onHudAction]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        const handler = new AssetHandler(ASSET_MANIFEST);
        const keys = Object.keys(ASSET_MANIFEST);

        let engine: GameEngine | null = null;
        let cancelled = false;
        let detachPointer: (() => void) | null = null;

        setPhase("loading");

        handler
            .preload(keys)
            .then(() => {
                if (cancelled) return;

                engine = new GameEngine({
                    canvas,
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    fixedDelta: 1 / 60,
                });

                const scene = new MultiplayerGameScene(
                    canvas,
                    room,
                    handler,
                    BOARD_X,
                    BOARD_Y,
                );
                sceneRef.current = scene;
                engine.scenes.register("main", scene);
                engine.scenes.switch("main");

                const hud = new CanvasHUDSystem();

                engine.preDraw = (ctx) => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    // Clip + translate scene drawing into the offset board region.
                    // Scene systems (grid, units, highlights) draw at logical
                    // (0,0); the translate shifts them onto the board.
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
                    ctx.clip();
                    ctx.translate(BOARD_X, BOARD_Y);
                };

                engine.postDraw = (ctx) => {
                    // Restore the canvas state so HUD draws outside the clip
                    ctx.restore();
                    hud.draw(ctx, latestStateRef.current, room.sessionId);
                };

                // Route pointer events to HUD hit-regions before the scene's
                // InputSystem sees them. If a HUD region claims the click, we
                // stop propagation so the canvas's own mousedown handler
                // (registered by InputSystem against the same target) ignores
                // the event.
                const handlePointer = (e: PointerEvent) => {
                    const rect = canvas.getBoundingClientRect();
                    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                    const regions = hud.getHitRegions();
                    for (const r of regions) {
                        if (
                            x >= r.x &&
                            x <= r.x + r.w &&
                            y >= r.y &&
                            y <= r.y + r.h
                        ) {
                            if (r.id === "menu" || r.id === "end_turn") {
                                onHudActionRef.current?.(r.id);
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                        }
                    }
                };
                canvas.addEventListener("pointerdown", handlePointer);
                detachPointer = () => {
                    canvas.removeEventListener("pointerdown", handlePointer);
                };

                engine.start();
                setPhase("ready");
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("[MultiplayerGameCanvas] Asset preload failed:", err);
                setPhase("error");
            });

        return () => {
            cancelled = true;
            detachPointer?.();
            engine?.stop();
            sceneRef.current = null;
        };
    }, [room]);

    // Reconcile on every state tick AND once when the scene becomes ready —
    // the latter handles the initial population so the non-active player
    // sees their units even before the opponent acts. See:
    // runebound-tactics/initial-state-reconcile/initial_state_reconcile_design_v1.0.md
    useEffect(() => {
        if (phase !== "ready") return;
        sceneRef.current?.reconcile(state);
    }, [state, phase]);

    return (
        <div
            className="relative"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
            <canvas
                ref={canvasRef}
                style={{ display: "block", width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            />
            {phase === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white">
                    Loading assets…
                </div>
            )}
            {phase === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 text-red-400">
                    Failed to load assets. Refresh to retry.
                </div>
            )}
        </div>
    );
}
