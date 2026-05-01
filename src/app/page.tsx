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
    const rafRef = useRef<number>(0);

    useEffect(() => {
        input.init();

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

            lines.push(`mouse (${Math.round(input.mouseX)}, ${Math.round(input.mouseY)})`);
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
            <pre className="text-sm text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 p-4 rounded min-w-64">
                {log.length ? log.join("\n") : "press keys or move mouse"}
            </pre>
        </div>
    );
}

