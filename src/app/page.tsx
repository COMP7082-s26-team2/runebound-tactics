"use client";

import { useEffect, useRef, useState } from "react";
import InputSystem from "@/lib/engine/InputSystem";

const input = new InputSystem();

input.defineAction("left", ["ArrowLeft", "KeyA"]);
input.defineAction("right", ["ArrowRight", "KeyD"]);
input.defineAction("up", ["ArrowUp", "KeyW"]);
input.defineAction("down", ["ArrowDown", "KeyS"]);

export default function Home() {
    const [log, setLog] = useState<string[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        input.init(canvasRef.current);

        const loop = () => {
            const lines: string[] = [];

            if (input.isActionHeld("left")) lines.push("left held");
            if (input.isActionHeld("right")) lines.push("right held");
            if (input.isActionHeld("up")) lines.push("up held");
            if (input.isActionHeld("down")) lines.push("down held");

            if (input.isActionJustPressed("left")) lines.push("left justPressed");
            if (input.isActionJustPressed("right")) lines.push("right justPressed");
            if (input.isActionJustPressed("up")) lines.push("up justPressed");
            if (input.isActionJustPressed("down")) lines.push("down justPressed");

            if (input.isActionJustReleased("left")) lines.push("left justReleased");
            if (input.isActionJustReleased("right")) lines.push("right justReleased");
            if (input.isActionJustReleased("up")) lines.push("up justReleased");
            if (input.isActionJustReleased("down")) lines.push("down justReleased");

            const hAxis = input.getAxis("left", "right");
            const vAxis = input.getAxis("up", "down");
            lines.push(`axis h=${hAxis} v=${vAxis}`);

            const mx = Math.round(input.mouseX);
            const my = Math.round(input.mouseY);
            const canvas = canvasRef.current;
            const insideCanvas =
                canvas !== null &&
                mx >= 0 && mx <= canvas.width &&
                my >= 0 && my <= canvas.height;
            lines.push(`mouse canvas pos: (${mx}, ${my}) — ${insideCanvas ? "inside canvas" : "outside canvas"}`);
            if (input.isMouseButtonHeld(0)) lines.push("LMB held");
            if (input.isMouseButtonJustPressed(0)) lines.push("LMB justPressed");
            if (input.isMouseButtonJustReleased(0)) lines.push("LMB justReleased");

            setLog([...lines]);
            input.update();
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(rafRef.current);
            input.destroy();
        };
    }, []);

    return (
        <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="border border-zinc-400 dark:border-zinc-600 bg-zinc-900"
            />
            <pre className="text-sm text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 p-4 rounded min-w-64 mt-4">
                {log.length ? log.join("\n") : "press keys or move mouse"}
            </pre>
        </div>
    );
}

