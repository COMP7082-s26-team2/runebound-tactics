"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/engine/GameEngine";

export default function GameCanvas() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;

        const engine = new GameEngine({
            canvas,
            width: 800,
            height: 600,
            fixedDelta: 1 / 60,
            debug: true,
        });

        // --- INIT ---
        engine.init = () => {
            console.log("Engine initialized");

            // Example component
            engine.addComponent({
                update(dt) {
                    // game logic
                },
                draw(ctx, alpha) {
                    ctx.fillStyle = "blue";
                    ctx.fillRect(100, 100, 50, 50);
                },
            });
        };

        // --- RENDER PIPELINE ---
        engine.preDraw = (ctx) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        engine.postDraw = (ctx) => {

        };

        // start engine
        engine.start();

        // cleanup (VERY important in Next.js)
        return () => {
            engine.stop();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block" }}
        />
    );
}