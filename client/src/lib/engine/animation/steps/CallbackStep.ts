import type {
    AnimationStep,
    StepContext,
    StepStatus,
} from "../AnimationSequencer";

/** Fires a one-shot callback on start, then completes immediately. */
export class CallbackStep implements AnimationStep {
    readonly duration = 0;

    constructor(private _fn: () => void) {}

    start(): void {
        this._fn();
    }

    update(_dt: number, _ctx: StepContext): StepStatus {
        return "completed";
    }

    cleanup(): void {}
}
