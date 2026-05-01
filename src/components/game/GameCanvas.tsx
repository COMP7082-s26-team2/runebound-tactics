"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/";

export interface GameCanvasOptions {
    debug?: boolean;
}

export default function GameCanvas({ debug = false }: GameCanvasOptions) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;

        const engine = new GameEngine({
            canvas,
            width: 800,
            height: 600,
            fixedDelta: 1 / 60,
            debug,
        });

        // init hook
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

        // render pipeline hooks
        engine.preDraw = (ctx) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        engine.postDraw = (ctx) => {};

        // start engine
        engine.start();

        // cleanup
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
