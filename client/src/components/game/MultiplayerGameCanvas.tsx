"use client";

import { useEffect, useRef } from "react";
import { GameEngine, AssetHandler } from "@/lib/engine";
import { useGameRoom, useGameRoomState } from "@/context/colyseus";
import { MultiplayerGameScene } from "@/lib/game/scenes/MultiplayerGameScene";
import { ASSET_MANIFEST } from "@/lib/game/assets";

type TurnOverlayProps = {
    currentTurnPlayerName: string | undefined;
    isMyTurn: boolean;
    turnNumber: number;
};

function TurnOverlay({
    currentTurnPlayerName,
    isMyTurn,
    turnNumber,
}: TurnOverlayProps) {
    return (
        <div
            style={{
                position: "absolute",
                top: 8,
                left: 8,
                color: "white",
                background: "rgba(0,0,0,0.55)",
                padding: "4px 10px",
                borderRadius: 4,
                pointerEvents: "none",
            }}
        >
            <div>Turn: {currentTurnPlayerName ?? "…"}</div>
            <div>
                {isMyTurn ? "YOUR TURN — press E to end turn" : "Waiting…"}
            </div>
            <div>Round: {turnNumber}</div>
        </div>
    );
}

export function MultiplayerGameCanvas() {
    const { room } = useGameRoom();
    const state = useGameRoomState();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<GameEngine | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !room) return;
        const canvas = canvasRef.current;

        const assetHandler = new AssetHandler(ASSET_MANIFEST);
        const manifestKeys = Object.keys(ASSET_MANIFEST);

        const scene = new MultiplayerGameScene(
            canvas,
            room,
            room.sessionId,
            assetHandler,
        );
        const engine = new GameEngine({
            canvas,
            width: 800,
            height: 800,
            fixedDelta: 1 / 60,
        });
        engineRef.current = engine;

        engine.init = () => scene.init();
        engine.update = (dt) => scene.update(dt);
        engine.preDraw = (ctx) => ctx.clearRect(0, 0, 800, 800);
        engine.draw = (ctx, alpha) => scene.draw(ctx, alpha);

        assetHandler
            .preload(manifestKeys)
            .catch((err) =>
                console.warn("[MultiplayerGameCanvas] preload error:", err),
            )
            .finally(() => {
                engine.start();
            });

        return () => {
            engine.stop();
            scene.destroy();
        };
    }, [room?.roomId]);

    const isMyTurn = state?.currentTurnId === room?.sessionId;
    const currentTurnPlayerName =
        state?.players?.[state?.currentTurnId ?? ""]?.displayName;

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <canvas
                ref={canvasRef}
                style={{ width: 800, height: 800, display: "block" }}
            />
            <TurnOverlay
                currentTurnPlayerName={currentTurnPlayerName}
                isMyTurn={isMyTurn ?? false}
                turnNumber={state?.turnNumber ?? 0}
            />
        </div>
    );
}
