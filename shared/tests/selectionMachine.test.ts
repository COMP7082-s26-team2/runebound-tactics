import { createSelectionMachine } from "../src/fsm/selection/SelectionMachine";
import type { SelectFriendlyPayload } from "../src/fsm/selection/events";

const SELECT_PAYLOAD: SelectFriendlyPayload = {
    unitId: "u1",
    reachable: new Set(["1,1", "1,2", "2,1"]),
    attackable: new Set(["e1"]),
    attackFromPositions: new Set(["1,1"]),
};

describe("selectionMachine", () => {
    it("starts in idle with an empty context", () => {
        const m = createSelectionMachine();
        expect(m.state).toBe("idle");
        expect(m.context.selectedUnitId).toBeNull();
        expect(m.context.reachableTiles.size).toBe(0);
        expect(m.context.attackableEnemies.size).toBe(0);
        expect(m.context.attackFromPositions.size).toBe(0);
        expect(m.context.pendingAttackFrom).toBeNull();
        expect(m.context.pendingTargetCandidates.size).toBe(0);
    });

    it("transitions idle → selected on SELECT_FRIENDLY and populates context", () => {
        const m = createSelectionMachine();
        m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
        expect(m.state).toBe("selected");
        expect(m.context.selectedUnitId).toBe("u1");
        expect(m.context.reachableTiles).toEqual(SELECT_PAYLOAD.reachable);
        expect(m.context.attackableEnemies).toEqual(SELECT_PAYLOAD.attackable);
        expect(m.context.attackFromPositions).toEqual(SELECT_PAYLOAD.attackFromPositions);
    });

    it("transitions selected → idle on MOVE_REQUESTED and clears context", () => {
        const m = createSelectionMachine();
        m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
        m.send("MOVE_REQUESTED", { unitId: "u1", to: { q: 1, r: 1 } });
        expect(m.state).toBe("idle");
        expect(m.context.selectedUnitId).toBeNull();
        expect(m.context.reachableTiles.size).toBe(0);
        expect(m.context.attackableEnemies.size).toBe(0);
    });

    it("transitions selected → idle on DESELECT and clears context", () => {
        const m = createSelectionMachine();
        m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
        m.send("DESELECT");
        expect(m.state).toBe("idle");
        expect(m.context.selectedUnitId).toBeNull();
    });

    it("ignores MOVE_REQUESTED and DESELECT while idle", () => {
        const m = createSelectionMachine();
        m.send("MOVE_REQUESTED", { unitId: "u1", to: { q: 0, r: 0 } });
        expect(m.state).toBe("idle");
        m.send("DESELECT");
        expect(m.state).toBe("idle");
    });

    it("ignores a second SELECT_FRIENDLY while already selected", () => {
        const m = createSelectionMachine();
        m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
        m.send("SELECT_FRIENDLY", { ...SELECT_PAYLOAD, unitId: "u2" });
        expect(m.context.selectedUnitId).toBe("u1");
    });

    it("notifies subscribers on each selection transition", () => {
        const m = createSelectionMachine();
        const states: string[] = [];
        m.subscribe((s) => states.push(s));
        m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
        m.send("DESELECT");
        expect(states).toEqual(["idle", "selected", "idle"]);
    });

    describe("attack flow (v1.1 unified two-click)", () => {
        it("full path: idle → selected → awaiting-attack-target → idle", () => {
            const m = createSelectionMachine();
            m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
            m.send("ATTACK_POSITION_CHOSEN", {
                attackerId: "u1",
                from: "1,1",
                adjacentEnemies: new Set(["e1"]),
            });
            expect(m.state).toBe("awaiting-attack-target");
            expect(m.context.pendingAttackFrom).toBe("1,1");
            expect(m.context.pendingTargetCandidates).toEqual(new Set(["e1"]));

            m.send("ATTACK_TARGET_CHOSEN", {
                attackerId: "u1",
                targetId: "e1",
                from: "1,1",
            });
            expect(m.state).toBe("idle");
            expect(m.context.selectedUnitId).toBeNull();
            expect(m.context.pendingAttackFrom).toBeNull();
        });

        it("zero-move attack: ATTACK_POSITION_CHOSEN(from=currentPos) → ATTACK_TARGET_CHOSEN", () => {
            // The client sends current-tile-as-attack-from; FSM doesn't know
            // or care whether it's a move or a stand-still attack.
            const m = createSelectionMachine();
            m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
            m.send("ATTACK_POSITION_CHOSEN", {
                attackerId: "u1",
                from: "0,0", // attacker's current position
                adjacentEnemies: new Set(["e1"]),
            });
            expect(m.state).toBe("awaiting-attack-target");
            m.send("ATTACK_TARGET_CHOSEN", {
                attackerId: "u1",
                targetId: "e1",
                from: "0,0",
            });
            expect(m.state).toBe("idle");
        });

        it("self-loop: ATTACK_POSITION_CHOSEN while in awaiting-attack-target swaps attack-from", () => {
            const m = createSelectionMachine();
            m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
            m.send("ATTACK_POSITION_CHOSEN", {
                attackerId: "u1",
                from: "1,1",
                adjacentEnemies: new Set(["e1"]),
            });
            m.send("ATTACK_POSITION_CHOSEN", {
                attackerId: "u1",
                from: "2,2",
                adjacentEnemies: new Set(["e2"]),
            });
            expect(m.state).toBe("awaiting-attack-target");
            expect(m.context.pendingAttackFrom).toBe("2,2");
            expect(m.context.pendingTargetCandidates).toEqual(new Set(["e2"]));
            // selectedUnitId preserved
            expect(m.context.selectedUnitId).toBe("u1");
        });

        it("CANCEL_ATTACK returns to selected, preserves reachable + attackable", () => {
            const m = createSelectionMachine();
            m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
            m.send("ATTACK_POSITION_CHOSEN", {
                attackerId: "u1",
                from: "1,1",
                adjacentEnemies: new Set(["e1"]),
            });
            m.send("CANCEL_ATTACK");
            expect(m.state).toBe("selected");
            expect(m.context.selectedUnitId).toBe("u1");
            expect(m.context.reachableTiles).toEqual(SELECT_PAYLOAD.reachable);
            expect(m.context.attackableEnemies).toEqual(SELECT_PAYLOAD.attackable);
            expect(m.context.pendingAttackFrom).toBeNull();
            expect(m.context.pendingTargetCandidates.size).toBe(0);
        });

        it("MOVE_REQUESTED from awaiting-attack-target transitions to idle (re-click same tile bug fix)", () => {
            const m = createSelectionMachine();
            m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
            m.send("ATTACK_POSITION_CHOSEN", {
                attackerId: "u1",
                from: "1,1",
                adjacentEnemies: new Set(["e1"]),
            });
            expect(m.state).toBe("awaiting-attack-target");
            m.send("MOVE_REQUESTED", { unitId: "u1", to: { q: 1, r: 1 } });
            expect(m.state).toBe("idle");
            expect(m.context.selectedUnitId).toBeNull();
            expect(m.context.pendingAttackFrom).toBeNull();
            expect(m.context.attackFromPositions.size).toBe(0);
        });

        it("DESELECT from awaiting-attack-target clears all context", () => {
            const m = createSelectionMachine();
            m.send("SELECT_FRIENDLY", SELECT_PAYLOAD);
            m.send("ATTACK_POSITION_CHOSEN", {
                attackerId: "u1",
                from: "1,1",
                adjacentEnemies: new Set(["e1"]),
            });
            m.send("DESELECT");
            expect(m.state).toBe("idle");
            expect(m.context.selectedUnitId).toBeNull();
            expect(m.context.attackableEnemies.size).toBe(0);
        });
    });
});
