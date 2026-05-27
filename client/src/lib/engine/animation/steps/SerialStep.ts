import type {
    AnimationStep,
    StepStatus,
} from "../AnimationSequencer";

/**
 * Runs child steps in order, one at a time. The next child starts only
 * after the previous one completed. Used inside a `ParallelStep` to
 * encode a delayed sub-sequence (e.g. target reaction kicks in after
 * a WaitStep delay equal to half the lunge duration).
 *
 * Duration = sum of child durations.
 */
export class SerialStep implements AnimationStep {
    readonly duration: number;
    private readonly _children: AnimationStep[];
    private _idx = 0;
    private _elapsed = 0;
    private _started = false;
    private _done = false;

    constructor(children: AnimationStep[]) {
        this._children = children;
        this.duration = children.reduce((sum, c) => sum + c.duration, 0);
    }

    start(): void {
        if (this._children.length === 0) {
            this._done = true;
            return;
        }
        this._children[0]!.start();
        this._started = true;
    }

    update(dt: number): StepStatus {
        if (this._done) return "completed";
        if (!this._started || this._idx >= this._children.length) {
            this._done = true;
            return "completed";
        }

        const child = this._children[this._idx]!;
        this._elapsed += dt;
        const status = child.update(dt, { elapsed: this._elapsed });
        if (status === "completed") {
            child.cleanup();
            this._idx++;
            this._elapsed = 0;
            if (this._idx >= this._children.length) {
                this._done = true;
                return "completed";
            }
            this._children[this._idx]!.start();
        }
        return "running";
    }

    cleanup(): void {
        if (this._idx < this._children.length && this._started && !this._done) {
            this._children[this._idx]?.cleanup();
        }
    }
}
