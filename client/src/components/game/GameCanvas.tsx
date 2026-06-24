"use client";

import { useEffect, useRef, useMemo } from "react";
import { GameEngine, AssetHandler } from "@/lib/";
import { GridMovementScene, ASSET_MANIFEST } from "@/lib/game/";
import { CanvasHUDSystem } from "@/components/game/CanvasHUDSystem";

export default function GameCanvas({ debug = false }: { debug?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const hud = useMemo(() => new CanvasHUDSystem(), []);

    const uiData = useMemo(() => ({
        tactician: { name: "Tactician Jas", rank: "Diamond I" },
        stats: { hp: "100/100", ad: 10 },
        status: { phase: "Action", turn: 1 },
        cards: Array(10).fill(null)
    }), []);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        
        const engine = new GameEngine({ 
            canvas, 
            width: 1200, 
            height: 900, 
            fixedDelta: 1 / 60, 
            debug 
        });

        const assetHandler = new AssetHandler(ASSET_MANIFEST);

        engine.init = async () => {
            await assetHandler.preload(Object.keys(ASSET_MANIFEST));
            const scene = new GridMovementScene(canvas, assetHandler);
            engine.scenes.register("main", scene);
            engine.scenes.switch("main");
        };

        // NEW: Apply clipping before the scene draws
        engine.preDraw = (ctx: CanvasRenderingContext2D) => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, 800, 800); // Grid is 10x10 at 80px = 800px total
            ctx.clip(); // Anything drawn outside this 800x800 box is now invisible
        };

        // NEW: Restore state after scene draws so HUD can render globally
        engine.postDraw = (ctx: CanvasRenderingContext2D) => {
            ctx.restore(); // Undo the clip
            hud.draw(ctx, uiData); // Draw UI on top
        };

        engine.start();
        return () => engine.stop();
    }, [debug, hud, uiData]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <canvas 
                ref={canvasRef} 
                width={1200} 
                height={900} 
                className="border-2 border-slate-800" 
            />
        </div>
    );
}