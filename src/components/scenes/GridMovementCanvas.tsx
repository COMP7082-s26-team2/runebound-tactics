"use client";

/**
 * This component is for MVP purposes only. It will be replaced with a more robust implementation in the future.
 */

import { useEffect, useRef } from "react";
import { GameEngine, AssetHandler } from "@/lib/";
import { GridMovementScene, ASSET_MANIFEST } from "@/lib/game/";

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

        const assetHandler = new AssetHandler(ASSET_MANIFEST);

        // Preload all assets before the engine starts
        engine.init = async () => {
            try {
                await assetHandler.preload(Object.keys(ASSET_MANIFEST), (loaded, total) => {
                    console.log(`Assets loaded: ${loaded}/${total}`);
                });
                console.log("All assets preloaded successfully");
            } catch (error) {
                console.error("Failed to preload assets:", error);
            }
        };

        const scene = new GridMovementScene(canvas, assetHandler);
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
