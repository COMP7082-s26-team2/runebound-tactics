"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/";
import { GridMovementScene } from "@/lib/game/scenes/GridMovementScene";

export interface GridMovementCanvasProps {
    debug?: boolean;
}

export default function GridMovementCanvas({
    debug = false,
}: GridMovementCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        engine.scenes.register("main", scene);
        engine.scenes.switch("main");

        engine.preDraw = (ctx) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        engine.start();

        return () => {
            engine.stop();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: "800px", height: "800px", display: "block" }}
        />
    );
}
