import { Scene } from "./Scene";

export class SceneManager {
    private _scenes = new Map<string, Scene>();
    private _current: Scene | null = null;

    register(name: string, scene: Scene): void {
        this._scenes.set(name, scene);
    }

    switch(name: string): void {
        this._current?.destroy();
        const next = this._scenes.get(name);
        if (!next) throw new Error(`Scene "${name}" not registered`);
        next.init();
        this._current = next;
    }

    get current(): Scene | null {
        return this._current;
    }

    update(dt: number): void {
        this._current?.update(dt);
    }

    draw(ctx: CanvasRenderingContext2D, alpha: number): void {
        this._current?.draw(ctx, alpha);
    }
}
