import { createSelectionMachine } from "../src/fsm/selection/SelectionMachine";

describe("selectionMachine", () => {
    it("starts in idle with an empty context", () => {
        const m = createSelectionMachine();
        expect(m.state).toBe("idle");
        expect(m.context.selectedUnitId).toBeNull();
        expect(m.context.reachableTiles.size).toBe(0);
    });

    it("transitions idle → selected on SELECT_FRIENDLY and populates context", () => {
        const m = createSelectionMachine();
        const reachable = new Set(["1,1", "1,2", "2,1"]);
        m.send("SELECT_FRIENDLY", { unitId: "u1", reachable });
        expect(m.state).toBe("selected");
        expect(m.context.selectedUnitId).toBe("u1");
        expect(m.context.reachableTiles).toEqual(reachable);
    });

    it("transitions selected → idle on MOVE_REQUESTED and clears context", () => {
        const m = createSelectionMachine();
        m.send("SELECT_FRIENDLY", {
            unitId: "u1",
            reachable: new Set(["1,1"]),
        });
        m.send("MOVE_REQUESTED", { unitId: "u1", to: { q: 1, r: 1 } });
        expect(m.state).toBe("idle");
        expect(m.context.selectedUnitId).toBeNull();
        expect(m.context.reachableTiles.size).toBe(0);
    });

    it("transitions selected → idle on DESELECT and clears context", () => {
        const m = createSelectionMachine();
        m.send("SELECT_FRIENDLY", {
            unitId: "u1",
            reachable: new Set(["1,1"]),
        });
        m.send("DESELECT");
        expect(m.state).toBe("idle");
        expect(m.context.selectedUnitId).toBeNull();
        expect(m.context.reachableTiles.size).toBe(0);
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
        m.send("SELECT_FRIENDLY", {
            unitId: "u1",
            reachable: new Set(["1,1"]),
        });
        m.send("SELECT_FRIENDLY", {
            unitId: "u2",
            reachable: new Set(["2,2"]),
        });
        expect(m.context.selectedUnitId).toBe("u1");
    });

    it("notifies subscribers on each selection transition", () => {
        const m = createSelectionMachine();
        const states: string[] = [];
        m.subscribe((s) => states.push(s));
        m.send("SELECT_FRIENDLY", {
            unitId: "u1",
            reachable: new Set(["1,1"]),
        });
        m.send("DESELECT");
        expect(states).toEqual(["idle", "selected", "idle"]);
    });
});
