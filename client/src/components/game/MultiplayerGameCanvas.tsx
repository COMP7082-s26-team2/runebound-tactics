"use client";

import { useEffect, useRef, useState } from "react";
import { GameEngine, AssetHandler } from "@/lib/engine";
import { MultiplayerGameScene } from "@/lib/game/scenes/MultiplayerGameScene";
import { ASSET_MANIFEST } from "@/lib/game/assets";
import {
    CELL_SIZE,
    GRID_COLS,
    GRID_ROWS,
    type GameState,
} from "@runebound-tactics/shared";
import type { Room } from "@colyseus/sdk";

interface MultiplayerGameCanvasProps {
    room: Room<GameState>;
    state: GameState;
}

const CANVAS_WIDTH = CELL_SIZE * GRID_COLS;
const CANVAS_HEIGHT = CELL_SIZE * GRID_ROWS;

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
 */
export function MultiplayerGameCanvas({ room, state }: MultiplayerGameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sceneRef = useRef<MultiplayerGameScene | null>(null);
    const [phase, setPhase] = useState<LoadPhase>("loading");

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        const handler = new AssetHandler(ASSET_MANIFEST);
        const keys = Object.keys(ASSET_MANIFEST);

        let engine: GameEngine | null = null;
        let cancelled = false;

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
                );
                sceneRef.current = scene;
                engine.scenes.register("main", scene);
                engine.scenes.switch("main");

                engine.preDraw = (ctx) => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
            className="relative aspect-square max-w-full max-h-full [image-rendering:pixelated]"
        >
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{ display: "block", width: "100%", height: "100%" }}
            />
            {phase === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--ink-900)]/80 text-[var(--ink-300)]">
                    Loading assets…
                </div>
            )}
            {phase === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--ink-900)]/90 text-[var(--seal-red)]">
                    Failed to load assets. Refresh to retry.
                </div>
            )}
        </div>
    );
}
