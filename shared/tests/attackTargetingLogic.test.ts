import {
    getAdjacentEnemies,
    computeAttackableEnemies,
    computeAttackFromPositionsByEnemy,
    AttackTargetingContext,
} from "../src/game/logic/AttackTargetingLogic";
import { squareGridNeighbors, cellKey } from "../src/game/grid-utils";
import type { GridCoord } from "../src/types/grid";

/**
 * Build an AttackTargetingContext from in-memory unit/owner/position maps.
 * Mirrors the structural-context pattern used by MovementLogic tests.
 */
function buildContext(units: Array<{
    id: string;
    owner: string;
    pos: GridCoord;
}>): AttackTargetingContext {
    const positionById = new Map<string, GridCoord>();
    const ownerById = new Map<string, string>();
    const occupantByCell = new Map<string, string>();
    for (const u of units) {
        positionById.set(u.id, u.pos);
        ownerById.set(u.id, u.owner);
        occupantByCell.set(cellKey(u.pos), u.id);
    }
    return {
        getNeighbors: squareGridNeighbors,
        getOccupant: (key) => occupantByCell.get(key),
        getOwner: (id) => ownerById.get(id),
        getPosition: (id) => positionById.get(id),
    };
}

describe("getAdjacentEnemies", () => {
    it("returns empty set when attacker has no owner", () => {
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
        ]);
        // Override getOwner to simulate unowned attacker
        const ctx2: AttackTargetingContext = {
            ...ctx,
            getOwner: (id) => (id === "A" ? undefined : ctx.getOwner(id)),
        };
        const result = getAdjacentEnemies(ctx2, "A", { q: 0, r: 0 });
        expect(result.size).toBe(0);
    });

    it("returns empty set when no neighbors are occupied", () => {
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
        ]);
        const result = getAdjacentEnemies(ctx, "A", { q: 0, r: 0 });
        expect(result.size).toBe(0);
    });

    it("returns single adjacent enemy", () => {
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E", owner: "p2", pos: { q: 1, r: 0 } },
        ]);
        const result = getAdjacentEnemies(ctx, "A", { q: 0, r: 0 });
        expect(result.size).toBe(1);
        expect(result.has("E")).toBe(true);
    });

    it("excludes friendly units in adjacent cells", () => {
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "F", owner: "p1", pos: { q: 1, r: 0 } },
            { id: "E", owner: "p2", pos: { q: 0, r: 1 } },
        ]);
        const result = getAdjacentEnemies(ctx, "A", { q: 0, r: 0 });
        expect(result.size).toBe(1);
        expect(result.has("E")).toBe(true);
        expect(result.has("F")).toBe(false);
    });

    it("returns multiple adjacent enemies in different directions", () => {
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E1", owner: "p2", pos: { q: 1, r: 0 } },
            { id: "E2", owner: "p2", pos: { q: -1, r: 0 } },
            { id: "E3", owner: "p2", pos: { q: 0, r: 1 } },
            { id: "E4", owner: "p2", pos: { q: 0, r: -1 } },
        ]);
        const result = getAdjacentEnemies(ctx, "A", { q: 0, r: 0 });
        expect(result.size).toBe(4);
        expect(result.has("E1")).toBe(true);
        expect(result.has("E4")).toBe(true);
    });

    it("computes from a hypothetical position, not just attacker's actual position", () => {
        // Attacker at (0,0). Enemy at (3,0). Hypothetical from-coord (2,0) is
        // adjacent to the enemy.
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E", owner: "p2", pos: { q: 3, r: 0 } },
        ]);
        const result = getAdjacentEnemies(ctx, "A", { q: 2, r: 0 });
        expect(result.has("E")).toBe(true);
    });

    it("excludes the attacker itself", () => {
        // Attacker hypothetically at a tile next to its own actual position;
        // its own cell on the neighbor side must not appear as an enemy.
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
        ]);
        const result = getAdjacentEnemies(ctx, "A", { q: 1, r: 0 });
        // Neighbor (0,0) is the attacker — must be excluded.
        expect(result.has("A")).toBe(false);
        expect(result.size).toBe(0);
    });
});

describe("computeAttackableEnemies", () => {
    it("includes adjacent enemies at attacker's current position (zero-move case)", () => {
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E", owner: "p2", pos: { q: 1, r: 0 } },
        ]);
        const result = computeAttackableEnemies(ctx, "A", new Set());
        expect(result.has("E")).toBe(true);
    });

    it("includes enemies adjacent to reachable tiles", () => {
        // Attacker at (0,0), enemy at (3,0). Reachable includes (2,0).
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E", owner: "p2", pos: { q: 3, r: 0 } },
        ]);
        const reachable = new Set(["1,0", "2,0"]);
        const result = computeAttackableEnemies(ctx, "A", reachable);
        expect(result.has("E")).toBe(true);
    });

    it("does not double-count an enemy adjacent to multiple reachable tiles", () => {
        // Enemy at (2,2). Reachable tiles (1,2), (2,1), (3,2), (2,3) are all
        // adjacent to it.
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E", owner: "p2", pos: { q: 2, r: 2 } },
        ]);
        const reachable = new Set(["1,2", "2,1", "3,2", "2,3"]);
        const result = computeAttackableEnemies(ctx, "A", reachable);
        expect(result.size).toBe(1);
        expect(result.has("E")).toBe(true);
    });

    it("returns empty when no enemies are in range from any reachable tile", () => {
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E", owner: "p2", pos: { q: 10, r: 10 } },
        ]);
        const reachable = new Set(["1,0", "2,0", "3,0"]);
        const result = computeAttackableEnemies(ctx, "A", reachable);
        expect(result.size).toBe(0);
    });

    it("excludes friendlies even when adjacent to reachable tiles", () => {
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "F", owner: "p1", pos: { q: 3, r: 0 } },
        ]);
        const reachable = new Set(["2,0"]);
        const result = computeAttackableEnemies(ctx, "A", reachable);
        expect(result.size).toBe(0);
    });
});

describe("computeAttackFromPositionsByEnemy", () => {
    it("maps enemy to set of attack-from tiles, including attacker's current position when adjacent", () => {
        // Attacker at (0,0), enemy at (1,0). Attacker's current pos is adjacent.
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E", owner: "p2", pos: { q: 1, r: 0 } },
        ]);
        const result = computeAttackFromPositionsByEnemy(ctx, "A", new Set());
        const fromE = result.get("E");
        expect(fromE).toBeDefined();
        expect(fromE!.has("0,0")).toBe(true);
    });

    it("includes reachable tiles adjacent to the enemy", () => {
        // Enemy at (3,3). Reachable tiles (2,3), (3,2), (4,3), (3,4) all adjacent.
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E", owner: "p2", pos: { q: 3, r: 3 } },
        ]);
        const reachable = new Set(["2,3", "3,2", "4,3", "3,4"]);
        const result = computeAttackFromPositionsByEnemy(ctx, "A", reachable);
        const fromE = result.get("E");
        expect(fromE).toBeDefined();
        expect(fromE!.has("2,3")).toBe(true);
        expect(fromE!.has("3,2")).toBe(true);
        expect(fromE!.has("4,3")).toBe(true);
        expect(fromE!.has("3,4")).toBe(true);
    });

    it("returns separate position sets for separate enemies", () => {
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E1", owner: "p2", pos: { q: 3, r: 0 } },
            { id: "E2", owner: "p2", pos: { q: 0, r: 3 } },
        ]);
        const reachable = new Set(["2,0", "0,2"]);
        const result = computeAttackFromPositionsByEnemy(ctx, "A", reachable);
        expect(result.get("E1")?.has("2,0")).toBe(true);
        expect(result.get("E2")?.has("0,2")).toBe(true);
        expect(result.get("E1")?.has("0,2")).toBe(false);
    });

    it("returns empty map when no enemies are attackable", () => {
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 0, r: 0 } },
            { id: "E", owner: "p2", pos: { q: 10, r: 10 } },
        ]);
        const reachable = new Set(["1,0", "2,0"]);
        const result = computeAttackFromPositionsByEnemy(ctx, "A", reachable);
        expect(result.size).toBe(0);
    });

    it("returns empty map when attacker has no position", () => {
        const ctx = buildContext([]);
        const result = computeAttackFromPositionsByEnemy(ctx, "ghost", new Set(["1,0"]));
        expect(result.size).toBe(0);
    });

    it("attacker's current position included even when not in reachableTiles", () => {
        // Attacker can't move (movement=0 ⇒ reachable is empty) but is already
        // adjacent to enemy. Current tile must still appear as an attack-from.
        const ctx = buildContext([
            { id: "A", owner: "p1", pos: { q: 5, r: 5 } },
            { id: "E", owner: "p2", pos: { q: 5, r: 6 } },
        ]);
        const result = computeAttackFromPositionsByEnemy(ctx, "A", new Set());
        expect(result.get("E")?.has("5,5")).toBe(true);
    });
});
