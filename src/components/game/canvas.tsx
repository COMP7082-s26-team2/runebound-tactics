"use client";
import { useEffect, useRef, useState } from "react";

interface CanvasProps {
    width?: number;
    height?: number;
    onInit?: (ctx: CanvasRenderingContext2D) => void;
    onUpdate?: (ctx: CanvasRenderingContext2D, deltaTime: number) => void;
    onDraw?: (ctx: CanvasRenderingContext2D, deltaTime: number) => void;
    debug?: boolean;
}

export default function Canvas({
    width = 800,
    height = 600,
    onInit,
    onUpdate,
    onDraw,
    debug = false,
}: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const frameCountRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);
    const [frameRate, setFrameRate] = useState<number>(0);
    const [tickRate, setTickRate] = useState<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        onInit?.(ctx);

        let tickCount = 0;
        let lastTickTimeRef = 0;

        const loop = (timestamp: number) => {
            const deltaTime = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;

            // Calculate frame rate
            frameCountRef.current++;
            if (timestamp - lastFrameTimeRef.current >= 1000) {
                setFrameRate(frameCountRef.current);
                frameCountRef.current = 0;
                lastFrameTimeRef.current = timestamp;
            }

            // Calculate tick rate
            tickCount++;
            if (timestamp - lastTickTimeRef >= 1000) {
                setTickRate(tickCount);
                tickCount = 0;
                lastTickTimeRef = timestamp;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            onUpdate?.(ctx, deltaTime);
            onDraw?.(ctx, deltaTime);

            // Draw debug info
            if (debug) {
                ctx.fillStyle = "#00ff00";
                ctx.font = "12px monospace";
                ctx.fillText(`FPS: ${frameRate}`, 10, 20);
                ctx.fillText(`Tick Rate: ${tickRate}`, 10, 40);
                ctx.fillText(`Canvas: ${canvas.width}x${canvas.height}`, 10, 60);
            }

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [onInit, onUpdate, debug]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ display: "block", background: "#222", border: "1px solid #333" }}
        />
    );
}
