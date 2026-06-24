"use client";

/**
 * This component is for MVP purposes only. It will be replaced with a more robust implementation in the future.
 */
import { GameHUD } from "@/components/game/GameHUD"; 
import { useEffect, useRef, useState } from "react";
import { GameEngine, AssetHandler } from "@/lib/";
import { GridMovementScene, ASSET_MANIFEST } from "@/lib/game/";
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
        // A full-screen dark background for your testing environment
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            
            {/* The Expanded Game Container (1350x950). The relative positioning here keeps the HUD tied to this outer box */}
            <div className="relative flex items-start justify-center pt-8 w-[1350px] h-[950px]">
                
               {/* The actual Game Canvas (800x800) */}
                <div 
                    className="border-2 border-slate-800 shadow-2xl rounded-lg overflow-hidden bg-slate-900" 
                    style={{ width: "800px", height: "800px" }}
                >
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={800}
                        style={{ display: "block", width: "800px", height: "800px" }}
                    />
                </div>
                {/* The HUD overlays the 1350x950 area, naturally pushing the absolute UI elements into the empty side margins! */}
                <GameHUD 
                    state={{ 
                        phase: turnPhase || "active", 
                        turnNumber: 0, 
                        currentTurnId: activePlayer, 
                        players: { [activePlayer]: { displayName: "Player 1", sessionId: activePlayer } } 
                    } as any}
                    sessionId={activePlayer}
                    onLeave={() => console.log("Leave clicked")}
                    onEndTurn={() => sceneRef.current?.endTurn()}
                />
            </div>
        </div>
    );
}