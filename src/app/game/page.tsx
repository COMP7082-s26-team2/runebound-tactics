"use client";

import Image from "next/image";

import Canvas from "@/components/game/canvas";

function update(ctx: CanvasRenderingContext2D, deltaTime: number) {
    ctx.fillStyle = "red";
    ctx.fillRect(300, 100, 50, 50);
    ctx.fillText(`Delta Time: ${deltaTime.toFixed(2)} ms`, 300, 100);
}

function draw(ctx: CanvasRenderingContext2D, deltaTime: number) {
    ctx.fillStyle = "red";
    ctx.fillRect(100, 100, 50, 50);
    ctx.fillText(`Delta Time: ${deltaTime.toFixed(2)} ms`, 100, 100);
}

export default function Home() {
    return (
        <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <Canvas debug
                onInit={() => {
                    console.log("Initializing canvas");
                }}

                onUpdate={(ctx: CanvasRenderingContext2D, deltaTime: number) => {
                    update(ctx, deltaTime);
                }}

                onDraw={(ctx: CanvasRenderingContext2D, deltaTime: number) => {
                    draw(ctx, deltaTime);
                }}
            />
        </div>
    );
}
