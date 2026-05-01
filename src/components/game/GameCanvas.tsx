"use client";

import { useEffect, useRef } from "react";
import { GameEngine, World } from "@/lib/";
import { UnitRenderSystem } from "@/lib/game/components/UnitRenderSystem";
import { GridRenderSystem } from "@/lib/game/components/GridRenderSystem";
import { SquareGrid } from "@/lib/engine/SquareGrid";

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

            const grid = new SquareGrid(50);
            const world = new World(grid);
            world.spawnUnit(
                { q: 2, r: 3 },
                {
                    attack: 10,
                    health: 100,
                    movement: 3,
                    name: "Warrior",
                    defense: 5,
                },
                { color: "red" },
            );
            world.spawnUnit(
                { q: 5, r: 6 },
                {
                    attack: 10,
                    health: 100,
                    movement: 3,
                    name: "Archer",
                    defense: 5,
                },
                { color: "green" },
            );

            engine.addComponent(new GridRenderSystem(world, 10, 10, 50));
            engine.addComponent(new UnitRenderSystem(world, 10, 10, 50));
        };

        // render pipeline hooks
        engine.preDraw = (ctx) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        engine.draw = (ctx) => {
            engine.components.draw(ctx, 1);
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
