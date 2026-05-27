import type {
    AnimationStep,
    StepStatus,
} from "../AnimationSequencer";

/**
 * Tick N child steps simultaneously. Completes when ALL children have
 * completed. Each child gets its own per-step elapsed counter so it sees
 * the same lifecycle as it would in a serial sequence.
 *
 * Duration = max(child.duration). Used for "lunge + attack-frame" pairing
 * in buildAttackSequence.
 */
export class ParallelStep implements AnimationStep {
    readonly duration: number;
    private readonly _states: Array<{
        child: AnimationStep;
        elapsed: number;
        done: boolean;
        started: boolean;
    }>;

    constructor(children: AnimationStep[]) {
        this.duration =
            children.length > 0
                ? Math.max(...children.map((c) => c.duration))
                : 0;
        this._states = children.map((child) => ({
            child,
            elapsed: 0,
            done: false,
            started: false,
        }));
    }

    start(): void {
        for (const s of this._states) {
            s.child.start();
            s.started = true;
        }
    }

    update(dt: number): StepStatus {
        let allDone = true;
        for (const s of this._states) {
            if (s.done) continue;
            s.elapsed += dt;
            const status = s.child.update(dt, { elapsed: s.elapsed });
            if (status === "completed") {
                s.child.cleanup();
                s.done = true;
            } else {
                allDone = false;
            }
        }
        return allDone ? "completed" : "running";
    }

    cleanup(): void {
        for (const s of this._states) {
            if (s.started && !s.done) s.child.cleanup();
        }
    }
}
