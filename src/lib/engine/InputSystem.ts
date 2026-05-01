type KeyInputFunction = (code: string) => boolean;
type ActionInputFunction = (name: string) => boolean;
type MouseInputFunction = (button: number) => boolean;
type KeyInputHandlerFunction = (e: KeyboardEvent) => void;
type MouseInputHandlerFunction = (e: MouseEvent) => void;

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
    private listeners: unknown[][] = [];
    private canvas: HTMLCanvasElement | null = null;

    init = (canvas: HTMLCanvasElement | null = null) => {};

    destroy = () => {};

    update = () => {};

    defineAction = (name: string, codes: string[]) => {};

    removeAction = (name: string) => {};

    isKeyHeld: KeyInputFunction = (code) => {
        return this.held.has(code);
    };

    isKeyJustPressed: KeyInputFunction = (code) => {
        return this.justPressed.has(code);
    };

    isKeyJustReleased: KeyInputFunction = (code) => {
        return this.justReleased.has(code);
    };

    isActionHeld: ActionInputFunction = (name) => {};

    isActionJustPressed: ActionInputFunction = (name) => {};

    isActionJustReleased: ActionInputFunction = (name) => {};

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
