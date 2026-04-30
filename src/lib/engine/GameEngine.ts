import { ComponentManager } from "./ComponentManager";
import { GameComponent } from "./GameComponent";

export type UpdateFn = (dt: number) => void;
export type RenderFn = (ctx: CanvasRenderingContext2D, alpha: number) => void;
export type DrawFn = (ctx: CanvasRenderingContext2D) => void;
export type InitFn = () => void;

export interface GameEngineOptions {
    canvas: HTMLCanvasElement;
    width?: number;
    height?: number;
    fixedDelta?: number;
    debug?: boolean;
}

export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    public components = new ComponentManager();

    private width: number;
    private height: number;

    private lastTime = 0;
    private accumulator = 0;
    private running = false;

    private fixedDelta: number;
    private debug: boolean;

    // --- debug counters ---
    private fps = 0;
    private ups = 0;

    private fpsCounter = 0;
    private upsCounter = 0;

    private fpsTimer = 0;
    private upsTimer = 0;

    // lifecycle hooks
    public init: InitFn = () => { };
    public update: UpdateFn = () => { };
    public preDraw: DrawFn = () => { };
    public draw: RenderFn = () => { };
    public postDraw: DrawFn = () => { };

    constructor({
        canvas,
        width = 800,
        height = 600,
        fixedDelta = 1 / 60,
        debug = false,
    }: GameEngineOptions) {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");

        this.canvas = canvas;
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.fixedDelta = fixedDelta;
        this.debug = debug;
    }

    // todo: move to scene manager
    public addComponent(component: GameComponent): void {
        this.components.add(component);
    }

    private removeComponent(component: GameComponent): void {
        this.components.remove(component);
    }


    public start(): void {
        if (this.running) return;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.running = true;
        this.lastTime = performance.now();

        this.init();

        requestAnimationFrame(this.loop);
    }

    public stop(): void {
        this.running = false;
    }

    private loop = (timestamp: number): void => {
        if (!this.running) return;

        let frameTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (frameTime > 0.25) frameTime = 0.25;

        // fps tracking
        this.fpsCounter++;
        this.fpsTimer += frameTime;

        if (this.fpsTimer >= 1) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTimer = 0;
        }

        this.accumulator += frameTime;

        // ups tracking and fixed update loop
        while (this.accumulator >= this.fixedDelta) {
            this.update(this.fixedDelta);
            this.components.update(this.fixedDelta);

            this.upsCounter++;

            this.accumulator -= this.fixedDelta;
        }

        this.upsTimer += frameTime;
        if (this.upsTimer >= 1) {
            this.ups = this.upsCounter;
            this.upsCounter = 0;
            this.upsTimer = 0;
        }

        const alpha = this.accumulator / this.fixedDelta;

        // render
        this.preDraw(this.ctx);
        this.draw(this.ctx, alpha);
        this.components.draw(this.ctx, alpha);

        if (this.debug) {
            this.renderDebug(this.ctx);
        }

        this.postDraw(this.ctx);

        requestAnimationFrame(this.loop);
    };

    private renderDebug(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        ctx.fillStyle = "white";
        ctx.font = "20px Consolas";

        ctx.fillText(`FPS: ${this.fps}`, 10, 20);
        ctx.fillText(`UPS: ${this.ups}`, 10, 40);
        ctx.fillText(`DT: ${this.fixedDelta.toFixed(4)}`, 10, 60);

        ctx.restore();
    }
}