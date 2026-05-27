import type { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import type { GameComponent } from "@/lib/engine/core/GameComponent";

/**
 * Multi-step animation orchestration for the multiplayer scene.
 *
 * The {@link AnimationSequencer} owns at most one {@link AnimationSequence}
 * per entity. Sequences are composed of ordered {@link AnimationStep}s that
 * each control a slice of the visual lifecycle (walk → lunge → death etc).
 *
 * Design: see `runebound-tactics/tween-sequencing/tween_sequencing_design_v1.0`.
 *
 * Lifecycle:
 *   - `play(entityId, sequence)` cancels any in-flight sequence for the
 *     entity (unless that sequence is `terminal`), then sets the new one as
 *     current.
 *   - `update(dt)` ticks every active sequence; completed sequences fire
 *     their `onComplete` callback and are removed from the map.
 *   - `cancel(entityId)` cleans up the current step and removes the entry.
 *
 * Pre-emption rule: `terminal` sequences (death animations) cannot be
 * replaced by a subsequent `play()` call — the new sequence is dropped
 * silently. Use `cancel(entityId)` if you really need to abort a terminal.
 */

export type StepStatus = "running" | "completed";

export interface StepContext {
    /** Seconds elapsed since this step's `start()` ran. */
    elapsed: number;
}

export interface AnimationStep {
    /** Total expected duration in seconds. Used for ETA queries; tests may verify. */
    readonly duration: number;
    /** Called once when the step becomes the current step in its sequence. */
    start(): void;
    /** Called every frame while the step is current. Return "completed" to advance. */
    update(dt: number, ctx: StepContext): StepStatus;
    /** Called once when the step completes naturally OR is cancelled. */
    cleanup(): void;
}

export interface AnimationSequenceOptions {
    /**
     * Terminal sequences (death animations) cannot be pre-empted by a later
     * `Sequencer.play(entityId, ...)` call. Default: false.
     */
    terminal?: boolean;
    /** Fires once after the last step completes naturally. Not fired on cancel. */
    onComplete?: () => void;
}

export class AnimationSequence {
    readonly terminal: boolean;
    private readonly _onComplete?: () => void;
    private _idx = 0;
    private _elapsed = 0;
    private _started = false;
    private _done = false;

    constructor(
        readonly steps: AnimationStep[],
        options: AnimationSequenceOptions = {},
    ) {
        this.terminal = options.terminal ?? false;
        this._onComplete = options.onComplete;
    }

    get isComplete(): boolean {
        return this._done;
    }

    /**
     * Advance the sequence by `dt` seconds. Returns true when the whole
     * sequence has completed (this frame or earlier).
     */
    update(dt: number): boolean {
        if (this._done) return true;
        if (this._idx >= this.steps.length) {
            this._done = true;
            this._onComplete?.();
            return true;
        }

        const step = this.steps[this._idx]!;
        if (!this._started) {
            step.start();
            this._started = true;
        }
        this._elapsed += dt;
        const status = step.update(dt, { elapsed: this._elapsed });
        if (status === "completed") {
            step.cleanup();
            this._idx++;
            this._elapsed = 0;
            this._started = false;

            // If that was the last step, fire completion immediately so
            // callers don't observe an extra "running" frame.
            if (this._idx >= this.steps.length) {
                this._done = true;
                this._onComplete?.();
                return true;
            }
        }
        return false;
    }

    /**
     * Mark the sequence as done without firing `onComplete`. The current
     * step's `cleanup()` runs so it can release resources / reset state.
     */
    cancel(): void {
        if (this._done) return;
        if (this._idx < this.steps.length && this._started) {
            this.steps[this._idx]?.cleanup();
        }
        this._done = true;
    }
}

export class AnimationSequencer implements GameComponent {
    /** Logic-only — no draw. Negative zIndex keeps render systems consistent. */
    readonly zIndex = -1;

    private readonly _active = new Map<EntityId, AnimationSequence>();

    /**
     * Play `sequence` on `entityId`. If an existing sequence is in flight:
     *   - if existing is `terminal` → the new sequence is dropped (logged)
     *   - otherwise → cancel existing, then set new
     */
    play(entityId: EntityId, sequence: AnimationSequence): void {
        const existing = this._active.get(entityId);
        if (existing) {
            if (existing.terminal) {
                // Refuse to override a terminal (death) sequence.
                return;
            }
            existing.cancel();
        }
        this._active.set(entityId, sequence);
    }

    /** True if `entityId` has an in-flight (non-completed) sequence. */
    isPlaying(entityId: EntityId): boolean {
        return this._active.has(entityId);
    }

    /** True if ANY entity has an in-flight sequence. */
    isAnyPlaying(): boolean {
        return this._active.size > 0;
    }

    /** Cancel the in-flight sequence for `entityId`, if any. */
    cancel(entityId: EntityId): void {
        const seq = this._active.get(entityId);
        if (!seq) return;
        seq.cancel();
        this._active.delete(entityId);
    }

    update(dt: number): void {
        // Iterate via Array.from to allow mutation during iteration.
        for (const [entityId, seq] of Array.from(this._active.entries())) {
            const done = seq.update(dt);
            if (done) this._active.delete(entityId);
        }
    }
}
