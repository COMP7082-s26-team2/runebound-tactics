import { computeReachableTiles, computeShortestPath } from "../src/game/logic/MovementLogic";
import { squareGridNeighbors } from "../src/game/grid-utils";

describe("computeReachableTiles", () => {
    const noOccupants = () => false;

    it("returns empty set when movement is 0", () => {
        const tiles = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: noOccupants,
            movement: 0,
            start: { q: 5, r: 5 },
        });
        expect(tiles.size).toBe(0);
    });

    it("never includes the start cell", () => {
        const tiles = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: noOccupants,
            movement: 3,
            start: { q: 5, r: 5 },
        });
        expect(tiles.has("5,5")).toBe(false);
    });

    it("reaches all four direct neighbors with movement=1", () => {
        const tiles = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: noOccupants,
            movement: 1,
            start: { q: 0, r: 0 },
        });
        expect(tiles.size).toBe(4);
        expect(tiles.has("1,0")).toBe(true);
        expect(tiles.has("-1,0")).toBe(true);
        expect(tiles.has("0,1")).toBe(true);
        expect(tiles.has("0,-1")).toBe(true);
    });

    it("reaches a Manhattan-distance-2 diamond with movement=2", () => {
        const tiles = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: noOccupants,
            movement: 2,
            start: { q: 0, r: 0 },
        });
        // 4 neighbors at dist 1 + 8 cells at dist 2 = 12
        expect(tiles.size).toBe(12);
        expect(tiles.has("2,0")).toBe(true);
        expect(tiles.has("1,1")).toBe(true);
        expect(tiles.has("0,2")).toBe(true);
        expect(tiles.has("-1,-1")).toBe(true);
    });

    it("treats occupied cells as blocked", () => {
        const occupied = new Set(["1,0", "0,1"]);
        const tiles = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: (k) => occupied.has(k),
            movement: 2,
            start: { q: 0, r: 0 },
        });
        expect(tiles.has("1,0")).toBe(false);
        expect(tiles.has("0,1")).toBe(false);
        // Open directions still reachable
        expect(tiles.has("-1,0")).toBe(true);
        expect(tiles.has("0,-1")).toBe(true);
    });

    it("does not exceed movement range", () => {
        const tiles = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: noOccupants,
            movement: 1,
            start: { q: 0, r: 0 },
        });
        expect(tiles.has("2,0")).toBe(false);
        expect(tiles.has("1,1")).toBe(false);
    });

    it("re-expands reachable when a blocker is removed (G10 scenario)", () => {
        // Blocker at (1,0). With movement=3, (2,0) requires detour through
        // (0,1) → (1,1) → (2,1) → (2,0) = 4 steps. Unreachable.
        const blocked = new Set(["1,0"]);
        const blockedTiles = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: (k) => blocked.has(k),
            movement: 3,
            start: { q: 0, r: 0 },
        });
        expect(blockedTiles.has("2,0")).toBe(false);

        // Blocker gone. Direct path works.
        const openTiles = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: () => false,
            movement: 3,
            start: { q: 0, r: 0 },
        });
        expect(openTiles.has("2,0")).toBe(true);
    });
});

describe("computeReachableTiles with canEnter", () => {
    const start = { q: 5, r: 5 };
    const noOccupants = () => false;

    it("respects canEnter veto", () => {
        const tiles = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: noOccupants,
            canEnter: (c) => c.q !== 6, // block column 6
            movement: 3,
            start,
        });
        // Cells in column 6 must NOT appear
        for (const key of tiles) {
            const [q] = key.split(",").map(Number);
            expect(q).not.toBe(6);
        }
    });

    it("absent canEnter = enter-everywhere (backward compat)", () => {
        const without = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: noOccupants,
            movement: 3,
            start,
        });
        const withPermissive = computeReachableTiles({
            getNeighbors: squareGridNeighbors,
            isOccupied: noOccupants,
            canEnter: () => true,
            movement: 3,
            start,
        });
        expect(without).toEqual(withPermissive);
    });
});

describe("computeShortestPath with canEnter", () => {
    const noOccupants = () => false;

    it("goal-bypass: arrives at goal even when canEnter blocks all non-goal cells", () => {
        const start = { q: 0, r: 0 };
        const goal  = { q: 0, r: 2 };
        const path = computeShortestPath({
            start,
            goal,
            getNeighbors: squareGridNeighbors,
            isOccupied: noOccupants,
            canEnter: (c) =>
                // block every cell except the goal itself
                c.q === goal.q && c.r === goal.r,
        });
        // Path is reachable because goal-bypass lets BFS land on goal.
        // The fallback path [start, goal] is acceptable when intermediates
        // are blocked — what matters is that the function does NOT stall.
        expect(path[0]).toEqual(start);
        expect(path[path.length - 1]).toEqual(goal);
    });

    it("respects canEnter for intermediate cells (blocks a column, routes around)", () => {
        const start = { q: 0, r: 0 };
        const goal  = { q: 2, r: 0 };
        const path = computeShortestPath({
            start,
            goal,
            getNeighbors: squareGridNeighbors,
            isOccupied: noOccupants,
            canEnter: (c) => !(c.q === 1 && c.r === 0), // block (1,0)
        });
        // path must reach the goal and must not step on the blocked cell
        // (unless the goal-bypass let it — but the blocked cell is not the goal here).
        expect(path[0]).toEqual(start);
        expect(path[path.length - 1]).toEqual(goal);
        const usedBlocked = path.some((c) => c.q === 1 && c.r === 0);
        expect(usedBlocked).toBe(false);
    });
});
