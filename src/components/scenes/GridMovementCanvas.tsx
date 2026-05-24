"use client";

/**
 * This component is for MVP purposes only. It will be replaced with a more robust implementation in the future.
 */

import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/";
import { GridMovementScene } from "@/lib/game/";
import type { TurnFlowPhase } from "@/lib/game/state";

export interface GridMovementCanvasProps {
    debug?: boolean;
}

export default function GridMovementCanvas({
    debug = false,
}: GridMovementCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sceneRef = useRef<GridMovementScene | null>(null);
    const [activePlayer, setActivePlayer] = useState("player1");
    const [turnPhase, setTurnPhase] = useState<TurnFlowPhase | null>(null);
    const [gamePhase, setGamePhase] = useState<string | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;

        const engine = new GameEngine({
            canvas,
            width: 800,
            height: 800,
            fixedDelta: 1 / 60,
            debug,
        });

        const scene = new GridMovementScene(canvas);
        sceneRef.current = scene;
        engine.scenes.register("main", scene);
        engine.scenes.switch("main");

        engine.preDraw = (ctx) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        engine.start();

        const onTurnBegin = (data: unknown) => {
            const { participant } = data as { participant: { id: string } };
            setActivePlayer(participant.id);
        };
        scene.eventBus.on("turn:begin", onTurnBegin);

        let rafId: number;
        const poll = () => {
            setTurnPhase(scene.turnFlow.current);
            setGamePhase(scene.state.current);
            rafId = requestAnimationFrame(poll);
        };
        rafId = requestAnimationFrame(poll);

        return () => {
            engine.stop();
            scene.eventBus.off("turn:begin", onTurnBegin);
            cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <div style={{ position: "relative", width: "800px", height: "800px" }}>
            <canvas
                ref={canvasRef}
                style={{ display: "block", width: "800px", height: "800px" }}
            />
            <div
                style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    color: "white",
                    background: "rgba(0,0,0,0.5)",
                    padding: "4px 8px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    lineHeight: "1.6",
                }}
            >
                <div>Turn: {activePlayer}</div>
                <div>Turn phase: {turnPhase ?? "—"}</div>
                <div>Game phase: {gamePhase ?? "—"}</div>
            </div>
            <button
                style={{ position: "absolute", bottom: 8, right: 8 }}
                onClick={() => sceneRef.current?.endTurn()}
            >
                End Turn
            </button>
        </div>
    );
}
