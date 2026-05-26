import { StateBase, type TransitionResult } from "../../StateBase";
import type {
    SelectionContext,
    SelectionEvent,
    AttackPositionChosenPayload,
} from "../events";
import { clearSelectionContext } from "./_helpers";

/**
 * Player has picked an attack-from tile and is selecting which adjacent enemy
 * to attack.
 *
 * Note: this state class is render- and host-agnostic. Server-only side
 * effects (Colyseus writes, world mutation) MUST live in the host's subscribe
 * callback or in the dispatching SelectionSystem, not in handler actions.
 * Per state_machine_shared_design_v3.0 §G5.
 */
export class AwaitingAttackTargetState extends StateBase<
    SelectionContext,
    SelectionEvent
> {
    readonly name = "awaiting-attack-target";

    handle(
        event: SelectionEvent,
        _ctx: SelectionContext,
        payload?: unknown,
    ): TransitionResult<SelectionContext> {
        // AP: combined move+attack consumes the unit's 1 AP. Server flips
        // hasMoved=true on success; subsequent reconcile blocks reselect via
        // unitIsExhausted.
        if (event === "ATTACK_TARGET_CHOSEN") {
            return {
                target: "idle",
                action: () => clearSelectionContext(),
            };
        }

        // Self-loop: player picked a different attack-from tile. Swap the
        // pending fields; keep reachable / attackable / selectedUnitId.
        if (event === "ATTACK_POSITION_CHOSEN") {
            const p = payload as AttackPositionChosenPayload;
            return {
                target: this.name,
                action: () => ({
                    pendingAttackFrom: p.from,
                    pendingTargetCandidates: p.adjacentEnemies,
                }),
            };
        }

        // Cancel: return to "selected" but preserve reachable / attackable
        // overlays from the original SELECT_FRIENDLY. Only clear the pending
        // fields.
        if (event === "CANCEL_ATTACK") {
            return {
                target: "selected",
                action: () => ({
                    pendingAttackFrom: null,
                    pendingTargetCandidates: new Set<string>(),
                }),
            };
        }

        // Hard deselect — full context wipe.
        if (event === "DESELECT") {
            return {
                target: "idle",
                action: () => clearSelectionContext(),
            };
        }

        return null;
    }
}
