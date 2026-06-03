import { SelectedState } from "../src/fsm/selection/states/SelectedState";
import type {
    SelectionContext,
    SelectionEvent,
    AttackPositionChosenPayload,
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
    reachableTiles: new Set(["1,1", "1,2"]),
    attackableEnemies: new Set(["e1"]),
    attackFromPositions: new Set(["1,1"]),
});

describe("SelectedState", () => {
    it("transitions to awaiting-attack-target on ATTACK_POSITION_CHOSEN", () => {
        const state = new SelectedState();
        const payload: AttackPositionChosenPayload = {
            attackerId: "u1",
            from: "1,1",
            adjacentEnemies: new Set(["e1"]),
        };
        const result = state.handle("ATTACK_POSITION_CHOSEN", makeCtx(), payload);
        expect(result).not.toBeNull();
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("awaiting-attack-target");
            const patch = result.action?.(makeCtx());
            expect(patch).toMatchObject({
                pendingAttackFrom: "1,1",
                pendingTargetCandidates: new Set(["e1"]),
            });
        }
    });

    it("returns transition to idle on MOVE_REQUESTED with context-clearing action", () => {
        const state = new SelectedState();
        const result = state.handle("MOVE_REQUESTED", makeCtx());
        expect(result).not.toBeNull();
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("idle");
            const patch = result.action?.(makeCtx());
            expect(patch).toMatchObject({
                selectedUnitId: null,
                reachableTiles: new Set(),
                attackableEnemies: new Set(),
                attackFromPositions: new Set(),
                pendingAttackFrom: null,
                pendingTargetCandidates: new Set(),
            });
        }
    });

    it("returns transition to idle on DESELECT", () => {
        const state = new SelectedState();
        const result = state.handle("DESELECT", makeCtx());
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("idle");
        }
    });

    it("returns null for SELECT_FRIENDLY (no re-select while selected)", () => {
        const state = new SelectedState();
        expect(state.handle("SELECT_FRIENDLY", makeCtx())).toBeNull();
    });

    it("returns null for ATTACK_TARGET_CHOSEN and CANCEL_ATTACK (out-of-state)", () => {
        const state = new SelectedState();
        expect(state.handle("ATTACK_TARGET_CHOSEN", makeCtx())).toBeNull();
        expect(state.handle("CANCEL_ATTACK", makeCtx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new SelectedState();
                expect(() => state.handle(event, makeCtx())).not.toThrow();
            });
        }
    });
});
