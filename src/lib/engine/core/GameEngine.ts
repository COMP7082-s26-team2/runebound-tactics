import { ComponentManager } from "./ComponentManager";
import { GameComponent } from "./GameComponent";
import { SceneManager } from "./SceneManager";

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
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;

    public components = new ComponentManager();
    public scenes = new SceneManager();

    private _width: number;
    private _height: number;

    private _lastTime: number = 0;
    private _accumulator: number = 0;
    private _running: boolean = false;

    private _fixedDelta: number;
    private _debug: boolean;

    // --- debug counters ---
    private _fps = 0;
    private _ups = 0;

    private _fpsCounter = 0;
    private _upsCounter = 0;

    private _fpsTimer = 0;
    private _upsTimer = 0;

    // lifecycle hooks
    public init: InitFn = () => {};
    public update: UpdateFn = () => {};
    public preDraw: DrawFn = () => {};
    public draw: RenderFn = () => {};
    public postDraw: DrawFn = () => {};

    constructor({
        canvas,
        width = 800,
        height = 600,
        fixedDelta = 1 / 60,
        debug = false,
    }: GameEngineOptions) {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");

        this._canvas = canvas;
        this._ctx = ctx;
        this._width = width;
        this._height = height;
        this._fixedDelta = fixedDelta;
        this._debug = debug;
    }

    // todo: move to scene manager
    public addComponent(component: GameComponent): void {
        this.components.add(component);
    }

    private removeComponent(component: GameComponent): void {
        this.components.remove(component);
    }

    public start(): void {
        if (this._running) return;

        this._canvas.width = this._width;
        this._canvas.height = this._height;

        this._running = true;
        this._lastTime = performance.now();

        this.init();

        requestAnimationFrame(this.loop);
    }

    public stop(): void {
        this._running = false;
    }

    // callback to be passed within the requestAnimationFrame
    private loop = (timestamp: number): void => {
        if (!this._running) return;

        let frameTime = (timestamp - this._lastTime) / 1000;
        this._lastTime = timestamp;

        if (frameTime > 0.25) frameTime = 0.25;

        // fps tracking
        this._fpsCounter++;
        this._fpsTimer += frameTime;

        if (this._fpsTimer >= 1) {
            this._fps = this._fpsCounter;
            this._fpsCounter = 0;
            this._fpsTimer = 0;
        }

        this._accumulator += frameTime;

        // ups tracking and fixed update loop
        while (this._accumulator >= this._fixedDelta) {
            this.update(this._fixedDelta);
            this.components.update(this._fixedDelta);
            this.scenes.update(this._fixedDelta);

            this._upsCounter++;

            this._accumulator -= this._fixedDelta;
        }

        this._upsTimer += frameTime;
        if (this._upsTimer >= 1) {
            this._ups = this._upsCounter;
            this._upsCounter = 0;
            this._upsTimer = 0;
        }

        const alpha = this._accumulator / this._fixedDelta;

        // render
        this.preDraw(this._ctx);
        this.draw(this._ctx, alpha);
        this.components.draw(this._ctx, alpha);
        this.scenes.draw(this._ctx, alpha);

        if (this._debug) {
            this.renderDebug(this._ctx);
        }

        this.postDraw(this._ctx);

        requestAnimationFrame(this.loop);
    };

    // todo: move to debug overlay
    private renderDebug(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        ctx.fillStyle = "white";
        ctx.font = "20px Consolas";

        ctx.fillText(`FPS: ${this._fps}`, 10, 20);
        ctx.fillText(`UPS: ${this._ups}`, 10, 40);
        ctx.fillText(`DT: ${this._fixedDelta.toFixed(4)}`, 10, 60);

        ctx.restore();
    }
}
