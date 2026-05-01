type KeyInputFunction = (code: string) => boolean;
type ActionInputFunction = (name: string) => boolean;
type MouseInputFunction = (button: number) => boolean;
type KeyInputHandlerFunction = (e: KeyboardEvent) => void;
type MouseInputHandlerFunction = (e: MouseEvent) => void;

type WindowListenerArray = [Window, string, (...args: unknown[]) => unknown];

class InputSystem {
    // Key states
    // KeyboardEvent.code values
    private held = new Set(); // currently held down
    private justPressed = new Set(); // pressed this frame (cleared on update)
    private justReleased = new Set(); // released this frame (cleared on update)

    // Counters
    // incremented each time a key is pressed
    // used to resolve two conflicting actions based on which was pressed last
    private pressCounter = 0;
    private pressOrder = new Map();

    // Mouse state
    private _mouseX = 0;
    private _mouseY = 0;
    private mouseHeld = new Set();
    private mouseJustPressed = new Set();
    private mouseJustReleased = new Set();

    // Action map
    private actions = new Map<string, string[]>();

    // Cleanup
    // NOTE: old code
    // private listeners: unknown[][] = [];
    private listeners: WindowListenerArray[] = [];
    private canvas: HTMLCanvasElement | null = null;

    init = (canvas: HTMLCanvasElement | null = null) => {};

    destroy = () => {
        for (const listener of this.listeners) {
            // const [target, type, fn] = listener as [string, string, () => void];
            const [target, type, fn] = listener as WindowListenerArray;

            target.removeEventListener(type, fn);

            this.listeners = [];
            this.canvas = null;
            this.held.clear();
            this.update();
            this.pressOrder.clear();
            this.pressCounter = 0;
            this.mouseHeld.clear();
        }
    };

    update = () => {
        this.justPressed.clear();
        this.justReleased.clear();
        this.mouseJustPressed.clear();
        this.mouseJustReleased.clear();
    };

    defineAction = (name: string, codes: string[]) => {
        this.actions.set(name, [...codes]);
    };

    removeAction = (name: string) => {
        this.actions.delete(name);
    };

    isKeyHeld: KeyInputFunction = (code) => {
        return this.held.has(code);
    };

    isKeyJustPressed: KeyInputFunction = (code) => {
        return this.justPressed.has(code);
    };

    isKeyJustReleased: KeyInputFunction = (code) => {
        return this.justReleased.has(code);
    };

    isActionHeld: ActionInputFunction = (name) => {
        const codes = this.actions.get(name);
        if (!codes) return false;

        return codes.some((curCode) => this.held.has(curCode));
    };

    isActionJustPressed: ActionInputFunction = (name) => {
        const codes = this.actions.get(name);
        if (!codes) return false;

        return codes.some((curCode) => this.justPressed.has(curCode));
    };

    isActionJustReleased: ActionInputFunction = (name) => {
        const codes = this.actions.get(name);
        if (!codes) return false;

        // some codes just released AND no other bound code is still held
        const anyJustReleased = codes.some((curCode) =>
            this.justReleased.has(curCode),
        );
        const noneStillheld = codes.every((curCode) => !this.held.has(curCode));

        return anyJustReleased && noneStillheld;
    };

    getAxis = (negAction: string, posAction: string): number => {};

    get mouseX(): number {
        return this._mouseX;
    }

    get mouseY(): number {
        return this._mouseY;
    }

    isMouseButtonHeld: MouseInputFunction = (button) => {
        return this.mouseHeld.has(button);
    };

    isMouseButtonJustPressed: MouseInputFunction = (button) => {
        return this.mouseJustPressed.has(button);
    };

    isMouseButtonJustReleased: MouseInputFunction = (button) => {
        return this.mouseJustReleased.has(button);
    };

    private onKeyDown: KeyInputHandlerFunction = (e) => {
        // ignore key-repeat events since held is already set
        if (e.repeat) return;

        this.held.add(e.code);

        this.justPressed.add(e.code);

        this.pressOrder.set(e.code, ++this.pressCounter);

        // remove from justReleased in case both fire in the same frame (rare case)
        this.justReleased.delete(e.code);
    };

    private onKeyUp: KeyInputHandlerFunction = (e) => {
        this.held.delete(e.code);
        this.justReleased.add(e.code);
        this.justPressed.delete(e.code);
    };

    private onMouseMove: MouseInputHandlerFunction = (e) => {
        if (this.canvas) {
            const rect = this.canvas.getBoundingClientRect();

            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            this._mouseX = (e.clientX - rect.left) * scaleX;
            this._mouseY = (e.clientY - rect.top) * scaleY;
        } else {
            this._mouseX = e.clientX;
            this._mouseY = e.clientY;
        }
    };

    private onMouseDown: MouseInputHandlerFunction = (e) => {
        this.mouseHeld.add(e.button);
        this.mouseJustPressed.add(e.button);
        this.mouseJustReleased.delete(e.button);
    };

    private onMouseUp: MouseInputHandlerFunction = (e) => {
        this.mouseHeld.delete(e.button);
        this.mouseJustReleased.add(e.button);
        this.mouseJustPressed.delete(e.button);
    };
}

export default InputSystem;
