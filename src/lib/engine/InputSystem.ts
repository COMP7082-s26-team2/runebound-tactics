type KeyInputFunction = (code: string) => void;
type ActionInputFunction = (name: string) => boolean;

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
    private mouseX = 0;
    private mouseY = 0;
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

    isKeyHeld: KeyInputFunction = (code) => {};

    isKeyJustPressed: KeyInputFunction = (code) => {};

    isKeyJustReleased: KeyInputFunction = (code) => {};

    isActionHeld: ActionInputFunction = (name) => {};

    isActionJustPressed: ActionInputFunction = (name) => {};

    isActionJustReleased: ActionInputFunction = (name) => {};

    getAxis = (negAction: string, posAction: string): number => {};
}

export default InputSystem;
