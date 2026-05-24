"use client";

/**
 * This component is for MVP purposes only. It will be replaced with a more robust implementation in the future.
 */

import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/";
import { GridMovementScene } from "@/lib/game/";

export interface GridMovementCanvasProps {
    debug?: boolean;
}

export default function GridMovementCanvas({
    debug = false,
}: GridMovementCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sceneRef = useRef<GridMovementScene | null>(null);
    const [activePlayer, setActivePlayer] = useState("player1");

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

        return () => {
            engine.stop();
            scene.eventBus.off("turn:begin", onTurnBegin);
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
                }}
            >
                Turn: {activePlayer}
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
