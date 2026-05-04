import { GameComponent } from "@/lib/engine";

type KeyInputFunction = (code: string) => boolean;
type ActionInputFunction = (name: string) => boolean;
type MouseInputFunction = (button: number) => boolean;
type KeyInputHandlerFunction = (e: KeyboardEvent) => void;
type MouseInputHandlerFunction = (e: MouseEvent) => void;

type WindowListenerArray = [
    EventTarget,
    string,
    (...args: unknown[]) => unknown,
];

export class InputSystem implements GameComponent {
    // Key states
    // KeyboardEvent.code values
    private _held = new Set(); // currently held down
    private _justPressed = new Set(); // pressed this frame (cleared on update)
    private _justReleased = new Set(); // released this frame (cleared on update)

    // Counters
    // incremented each time a key is pressed
    // used to resolve two conflicting actions based on which was pressed last
    private _pressCounter = 0;
    private _pressOrder = new Map();

    // Mouse state
    private _mouseX = 0;
    private _mouseY = 0;
    private _mouseHeld = new Set();
    private _mouseJustPressed = new Set();
    private _mouseJustReleased = new Set();

    // Action map
    private _actions = new Map<string, string[]>();

    // Cleanup
    private _listeners: WindowListenerArray[] = [];
    private _canvas: HTMLCanvasElement | null;

    constructor(canvas: HTMLCanvasElement | null = null) {
        this._canvas = canvas;
    }

    init = () => {
        // remove any previous listeners
        this.destroy();

        const onKeyDown: KeyInputHandlerFunction = (e) => this.onKeyDown(e);
        const onKeyUp: KeyInputHandlerFunction = (e) => this.onKeyUp(e);

        const mouseTarget = this._canvas ?? window;

        const onMouseMove: MouseInputHandlerFunction = (e) =>
            this.onMouseMove(e);
        const onMouseDown: MouseInputHandlerFunction = (e) =>
            this.onMouseDown(e);
        const onMouseUp: MouseInputHandlerFunction = (e) => this.onMouseUp(e);
        const onContextMenu: MouseInputHandlerFunction = (e) =>
            e.preventDefault();

        const mouseListeners: [string, MouseInputHandlerFunction][] = [
            ["mousemove", onMouseMove],
            ["mousedown", onMouseDown],
            ["mouseup", onMouseUp],
            ["contextmenu", onContextMenu],
        ];

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        this._listeners.push([
            window,
            "keydown",
            onKeyDown as (...args: unknown[]) => unknown,
        ]);
        this._listeners.push([
            window,
            "keyup",
            onKeyUp as (...args: unknown[]) => unknown,
        ]);

        for (const [type, handler] of mouseListeners) {
            mouseTarget.addEventListener(type, handler as EventListener);
            this._listeners.push([
                mouseTarget,
                type,
                handler as (...args: unknown[]) => unknown,
            ]);
        }
    };

    destroy = () => {
        for (const [target, type, fn] of this._listeners) {
            target.removeEventListener(type, fn);
        }
        this._listeners = [];
        this._held.clear();
        this._justPressed.clear();
        this._justReleased.clear();
        this._pressOrder.clear();
        this._pressCounter = 0;
        this._mouseHeld.clear();
        this._mouseJustPressed.clear();
        this._mouseJustReleased.clear();
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update = (_dt: number) => {
        this._justPressed.clear();
        this._justReleased.clear();
        this._mouseJustPressed.clear();
        this._mouseJustReleased.clear();
    };

    defineAction = (name: string, codes: string[]) => {
        this._actions.set(name, [...codes]);
    };

    removeAction = (name: string) => {
        this._actions.delete(name);
    };

    isKeyHeld: KeyInputFunction = (code) => {
        return this._held.has(code);
    };

    isKeyJustPressed: KeyInputFunction = (code) => {
        return this._justPressed.has(code);
    };

    isKeyJustReleased: KeyInputFunction = (code) => {
        return this._justReleased.has(code);
    };

    isActionHeld: ActionInputFunction = (name) => {
        const codes = this._actions.get(name);
        if (!codes) return false;

        return codes.some((curCode) => this._held.has(curCode));
    };

    isActionJustPressed: ActionInputFunction = (name) => {
        const codes = this._actions.get(name);
        if (!codes) return false;

        return codes.some((curCode) => this._justPressed.has(curCode));
    };

    isActionJustReleased: ActionInputFunction = (name) => {
        const codes = this._actions.get(name);
        if (!codes) return false;

        // some codes just released AND no other bound code is still held
        const anyJustReleased = codes.some((curCode) =>
            this._justReleased.has(curCode),
        );
        const noneStillheld = codes.every(
            (curCode) => !this._held.has(curCode),
        );

        return anyJustReleased && noneStillheld;
    };

    getAxis = (negAction: string, posAction: string): number => {
        // both held: find the most recent pressed bound key for each action
        const _latestOrder = (name: string) => {
            const codes = this._actions.get(name) ?? [];

            let max = -1;

            for (const curCode of codes) {
                const t = this._pressOrder.get(curCode) ?? -1;
                if (t > max) max = t;
            }

            return max;
        };

        const negHeld = this.isActionHeld(negAction);
        const posHeld = this.isActionHeld(posAction);

        if (!negHeld && !posHeld) return 0;
        if (negHeld && !posHeld) return -1;
        if (!negHeld && posHeld) return +1;

        return _latestOrder(posAction) > _latestOrder(negAction) ? +1 : -1;
    };

    get mouseX(): number {
        return this._mouseX;
    }

    get mouseY(): number {
        return this._mouseY;
    }

    isMouseButtonHeld: MouseInputFunction = (button) => {
        return this._mouseHeld.has(button);
    };

    isMouseButtonJustPressed: MouseInputFunction = (button) => {
        return this._mouseJustPressed.has(button);
    };

    isMouseButtonJustReleased: MouseInputFunction = (button) => {
        return this._mouseJustReleased.has(button);
    };

    private onKeyDown: KeyInputHandlerFunction = (e) => {
        // ignore key-repeat events since held is already set
        if (e.repeat) return;

        this._held.add(e.code);

        this._justPressed.add(e.code);

        this._pressOrder.set(e.code, ++this._pressCounter);

        // remove from justReleased in case both fire in the same frame (rare case)
        this._justReleased.delete(e.code);
    };

    private onKeyUp: KeyInputHandlerFunction = (e) => {
        this._held.delete(e.code);
        this._justReleased.add(e.code);
        this._justPressed.delete(e.code);
    };

    private onMouseMove: MouseInputHandlerFunction = (e) => {
        if (this._canvas) {
            const rect = this._canvas.getBoundingClientRect();

            const scaleX = this._canvas.width / rect.width;
            const scaleY = this._canvas.height / rect.height;

            this._mouseX = (e.clientX - rect.left) * scaleX;
            this._mouseY = (e.clientY - rect.top) * scaleY;
        } else {
            this._mouseX = e.clientX;
            this._mouseY = e.clientY;
        }
    };

    private onMouseDown: MouseInputHandlerFunction = (e) => {
        this._mouseHeld.add(e.button);
        this._mouseJustPressed.add(e.button);
        this._mouseJustReleased.delete(e.button);
    };

    private onMouseUp: MouseInputHandlerFunction = (e) => {
        this._mouseHeld.delete(e.button);
        this._mouseJustReleased.add(e.button);
        this._mouseJustPressed.delete(e.button);
    };
}
