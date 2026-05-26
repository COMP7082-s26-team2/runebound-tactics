import type {
    AnimationStep,
    StepContext,
    StepStatus,
} from "../AnimationSequencer";

/**
 * Pure timer. No side effects. Useful for inter-step pauses.
 */
export class WaitStep implements AnimationStep {
    readonly duration: number;

    constructor(duration: number) {
        this.duration = duration;
    }

    start(): void {
        /* no-op */
    }

    update(_dt: number, ctx: StepContext): StepStatus {
        return ctx.elapsed >= this.duration ? "completed" : "running";
    }

    cleanup(): void {
        /* no-op */
    }
}
