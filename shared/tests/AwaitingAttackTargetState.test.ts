import { AwaitingAttackTargetState } from "../src/fsm/selection/states/AwaitingAttackTargetState";
import type {
    SelectionContext,
    SelectionEvent,
    AttackPositionChosenPayload,
    AttackTargetChosenPayload,
} from "../src/fsm/selection/events";
import { emptySelectionContext } from "../src/fsm/selection/states/_helpers";

const ALL_EVENTS: SelectionEvent[] = [
    "SELECT_FRIENDLY",
    "MOVE_REQUESTED",
    "ATTACK_POSITION_CHOSEN",
    "ATTACK_TARGET_CHOSEN",
    "CANCEL_ATTACK",
    "DESELECT",
];

const makeCtx = (): SelectionContext => ({
    ...emptySelectionContext(),
    selectedUnitId: "u1",
    reachableTiles: new Set(["1,1", "1,2", "2,2"]),
    attackableEnemies: new Set(["e1"]),
    attackFromPositions: new Set(["1,1", "2,2"]),
    pendingAttackFrom: "1,1",
    pendingTargetCandidates: new Set(["e1"]),
});

describe("AwaitingAttackTargetState", () => {
    it("transitions to idle on ATTACK_TARGET_CHOSEN with full context clear", () => {
        const state = new AwaitingAttackTargetState();
        const payload: AttackTargetChosenPayload = {
            attackerId: "u1",
            targetId: "e1",
            from: "1,1",
        };
        const result = state.handle("ATTACK_TARGET_CHOSEN", makeCtx(), payload);
        expect(result).not.toBeNull();
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("idle");
            const patch = result.action?.(makeCtx());
            expect(patch).toMatchObject({
                selectedUnitId: null,
                pendingAttackFrom: null,
                pendingTargetCandidates: new Set(),
            });
        }
    });

    it("self-loops on ATTACK_POSITION_CHOSEN, swapping attack-from and candidates", () => {
        const state = new AwaitingAttackTargetState();
        const payload: AttackPositionChosenPayload = {
            attackerId: "u1",
            from: "2,2",
            adjacentEnemies: new Set(["e2"]),
        };
        const result = state.handle("ATTACK_POSITION_CHOSEN", makeCtx(), payload);
        expect(result).not.toBeNull();
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("awaiting-attack-target");
            const patch = result.action?.(makeCtx());
            expect(patch).toMatchObject({
                pendingAttackFrom: "2,2",
                pendingTargetCandidates: new Set(["e2"]),
            });
        }
    });

    it("transitions to selected on CANCEL_ATTACK, preserving reachable + attackable", () => {
        const state = new AwaitingAttackTargetState();
        const result = state.handle("CANCEL_ATTACK", makeCtx());
        expect(result).not.toBeNull();
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("selected");
            const patch = result.action?.(makeCtx());
            // Only pending fields clear; reachable / attackable preserved
            expect(patch).toMatchObject({
                pendingAttackFrom: null,
                pendingTargetCandidates: new Set(),
            });
            // Specifically NOT cleared
            expect(patch).not.toHaveProperty("selectedUnitId");
            expect(patch).not.toHaveProperty("reachableTiles");
            expect(patch).not.toHaveProperty("attackableEnemies");
            expect(patch).not.toHaveProperty("attackFromPositions");
        }
    });

    it("transitions to idle on DESELECT with full context clear", () => {
        const state = new AwaitingAttackTargetState();
        const result = state.handle("DESELECT", makeCtx());
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("idle");
            const patch = result.action?.(makeCtx());
            expect(patch).toMatchObject({
                selectedUnitId: null,
                attackableEnemies: new Set(),
                attackFromPositions: new Set(),
            });
        }
    });

    it("transitions to idle on MOVE_REQUESTED with full context clear (re-click pending tile)", () => {
        const state = new AwaitingAttackTargetState();
        const result = state.handle("MOVE_REQUESTED", makeCtx());
        expect(result).not.toBeNull();
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("idle");
            const patch = result.action?.(makeCtx());
            expect(patch).toMatchObject({
                selectedUnitId: null,
                attackableEnemies: new Set(),
                attackFromPositions: new Set(),
                pendingAttackFrom: null,
                pendingTargetCandidates: new Set(),
            });
        }
    });

    it("returns null for out-of-state SELECT_FRIENDLY", () => {
        const state = new AwaitingAttackTargetState();
        expect(state.handle("SELECT_FRIENDLY", makeCtx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new AwaitingAttackTargetState();
                expect(() =>
                    state.handle(event, makeCtx(), {
                        attackerId: "u1",
                        from: "1,1",
                        adjacentEnemies: new Set(),
                        targetId: "e1",
                    } as AttackPositionChosenPayload & AttackTargetChosenPayload),
                ).not.toThrow();
            });
        }
    });
});
