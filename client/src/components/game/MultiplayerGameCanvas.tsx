"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/engine";
import { MultiplayerGameScene } from "@/lib/game/scenes/MultiplayerGameScene";
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

/**
 * Canvas wrapper: spins up GameEngine + MultiplayerGameScene once, then
 * reconciles state on every Colyseus snapshot.
 *
 * Two effects, both required:
 *   1. Init (once, on mount): create engine, register scene, switch to it,
 *      start the render loop. Cleanup stops the engine on unmount.
 *   2. Reconcile (on each `state` change): scene.reconcile(state) syncs
 *      `state.units` → local World so the new positions render.
 */
export function MultiplayerGameCanvas({ room, state }: MultiplayerGameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sceneRef = useRef<MultiplayerGameScene | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        const engine = new GameEngine({
            canvas,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            fixedDelta: 1 / 60,
        });

        const scene = new MultiplayerGameScene(canvas, room);
        sceneRef.current = scene;
        engine.scenes.register("main", scene);
        engine.scenes.switch("main");

        engine.preDraw = (ctx) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        engine.start();

        return () => {
            engine.stop();
            sceneRef.current = null;
        };
    }, [room]);

    useEffect(() => {
        sceneRef.current?.reconcile(state);
    }, [state]);

    return (
        <canvas
            ref={canvasRef}
            style={{ display: "block", width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        />
    );
}
