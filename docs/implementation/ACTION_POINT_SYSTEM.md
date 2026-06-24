# Implementation Plan: Action Point System

Implements the `ActionPointSystem` described in [`docs/design/ACTION_POINT_SYSTEM.md`](../design/ACTION_POINT_SYSTEM.md).

---

## Files

| File | Status | Change |
|---|---|---|
| `shared/src/game/ActionPointSystem.ts` | **New** | `AP_COST` constants + `ActionPointSystem` static class |
| `shared/src/game/units/unit-stats.ts` | Modify | Add `UNIT_BASE_AP` table + `getUnitBaseAp()` helper |
| `shared/src/game/units/unit-status.ts` | Modify | Replace `unitIsExhausted` predicate (AP-5 anchor) |
| `shared/src/game/index.ts` | Modify | Export `ActionPointSystem`, `AP_COST` |
| `shared/src/schemas/GameState.ts` | Modify | Add `actionPoints`, `bonusAp` to `GameUnit` |
| `server/src/rooms/GameRoom.ts` | Modify | 5 call sites: imports, move guard, attack deduct, turn-advance restore, spawn init |
| `shared/tests/actionPointSystem.test.ts` | **New** | Unit tests for all three methods + updated `unitIsExhausted` |
| `shared/tests/unitStatus.test.ts` | Modify | Replace `hasMoved`-based assertions with `actionPoints`-based ones |

---

## 1. `shared/src/game/ActionPointSystem.ts` — New file

```ts
import { getUnitBaseAp, type UnitTypeId } from "./units/unit-stats";

export const AP_COST = {
    MOVE:   1,
    ATTACK: 1,
} as const;

export class ActionPointSystem {
    static canAfford(unit: { actionPoints: number }, cost: number): boolean {
        return unit.actionPoints >= cost;
    }

    static deduct(unit: { actionPoints: number }, cost: number): void {
        unit.actionPoints = Math.max(0, unit.actionPoints - cost);
    }

    static restore(unit: {
        actionPoints: number;
        bonusAp: number;
        unitType: string;
    }): void {
        unit.actionPoints =
            getUnitBaseAp(unit.unitType as UnitTypeId) + unit.bonusAp;
    }
}
```

---

## 2. `shared/src/game/units/unit-stats.ts` — Add `getUnitBaseAp`

Add after the existing `UNIT_DEFENSE` / `getUnitDefense` block:

```ts
const UNIT_BASE_AP: Record<string, number> = {
    "castle:swordsman":        2,
    "castle:archer":           2,
    "castle:paladin":          2,
    "castle:cavalier":         2,
    "castle:griffin":          2,
    "necropolis:skeleton":     2,
    "necropolis:death_knight": 2,
    "necropolis:vampire":      2,
    "necropolis:ghost":        2,
    "necropolis:zombie":       2,
};

const DEFAULT_BASE_AP = 2;

export function getUnitBaseAp(unitType: UnitTypeId): number {
    return UNIT_BASE_AP[unitType] ?? DEFAULT_BASE_AP;
}
```

---

## 3. `shared/src/game/units/unit-status.ts` — Replace full file (AP-5 anchor)

```ts
import { AP_COST } from "../ActionPointSystem";

export function unitIsExhausted(unit: { actionPoints: number }): boolean {
    return unit.actionPoints < AP_COST.MOVE;
}
```

The structural parameter type changes from `{ hasMoved: boolean }` to `{ actionPoints: number }`. All callers pass a `GameUnit` or a structural plain object; both carry `actionPoints` after step 5.

---

## 4. `shared/src/game/index.ts` — Export new symbols

```diff
+export { ActionPointSystem, AP_COST } from "./ActionPointSystem";
 export * from "./grid-utils";
 export * from "./logic";
 export * from "./units/unit-stats";
 export * from "./units/unit-status";
```

`getUnitBaseAp` is already covered by `export * from "./units/unit-stats"`.

---

## 5. `shared/src/schemas/GameState.ts` — Add fields to `GameUnit`

```diff
     @type("boolean") hasActed: boolean = false;

     @type("boolean") hasMoved: boolean = false;
+
+    /** Current action points. Decrements per move/attack; restored at turn start. */
+    @type("int32") actionPoints: number = 0;
+
+    /** Bonus AP stacked on top of base_ap at turn-start restore. Default 0. */
+    @type("int32") bonusAp: number = 0;
 }
```

---

## 6. `server/src/rooms/GameRoom.ts` — 5 call sites

### 6a. Add imports

```diff
 import {
+    ActionPointSystem,
+    AP_COST,
     GamePlayerSlot,
     GameState,
     GameUnit,
```

### 6b. `move_unit` handler — replace `hasMoved` guard with AP check

```diff
-        if (unit.hasMoved) return;
+        if (!ActionPointSystem.canAfford(unit, AP_COST.MOVE)) return;

         const destKey = cellKey({ q: payload.x, r: payload.y });
         const reachable = this._reachabilityCache.get(unit.unitId);
         if (!reachable || !reachable.has(destKey)) return;

         const prevPos: GridCoord = { q: unit.x, r: unit.y };
         unit.x = payload.x;
         unit.y = payload.y;
         unit.hasMoved = true;
+        ActionPointSystem.deduct(unit, AP_COST.MOVE);
```

### 6c. `_handleAttack()` — deduct AP on successful attack commit

```diff
         // 1-AP exhaustion: flip on any successful attack.
         attacker.hasMoved = true;
         attacker.hasActed = true;
+        ActionPointSystem.deduct(attacker, AP_COST.ATTACK);
```

### 6d. `_performTurnAdvance()` — restore AP alongside flag reset

```diff
         for (const unit of this.state.units.values()) {
             if (unit.ownerId === this.state.currentTurnId) {
                 unit.hasMoved = false;
                 unit.hasActed = false;
+                ActionPointSystem.restore(unit);
             }
         }
```

### 6e. `_spawnInitialUnits()` — initialise AP on unit creation

```diff
                 unit.hasMoved = false;
                 unit.hasActed = false;
+                ActionPointSystem.restore(unit);
                 this.state.units.set(unit.unitId, unit);
```

---

## 7. `shared/tests/actionPointSystem.test.ts` — New test file

```ts
import { ActionPointSystem, AP_COST } from "../src/game/ActionPointSystem";
import { unitIsExhausted } from "../src/game/units/unit-status";
import { getUnitBaseAp } from "../src/game/units/unit-stats";

const unit = (ap: number) => ({ actionPoints: ap });
const spawnUnit = (unitType: string, bonusAp = 0) => ({
    actionPoints: 0,
    bonusAp,
    unitType,
});

describe("ActionPointSystem.canAfford", () => {
    it("returns true when AP exceeds cost", () => {
        expect(ActionPointSystem.canAfford(unit(3), 2)).toBe(true);
    });

    it("returns true on exact match", () => {
        expect(ActionPointSystem.canAfford(unit(1), 1)).toBe(true);
    });

    it("returns false when AP is insufficient", () => {
        expect(ActionPointSystem.canAfford(unit(0), 1)).toBe(false);
    });
});

describe("ActionPointSystem.deduct", () => {
    it("decrements actionPoints by cost", () => {
        const u = unit(2);
        ActionPointSystem.deduct(u, AP_COST.MOVE);
        expect(u.actionPoints).toBe(1);
    });

    it("clamps to 0 on over-spend", () => {
        const u = unit(0);
        ActionPointSystem.deduct(u, AP_COST.ATTACK);
        expect(u.actionPoints).toBe(0);
    });
});

describe("ActionPointSystem.restore", () => {
    it("sets actionPoints to base_ap when bonusAp is 0", () => {
        const u = spawnUnit("castle:swordsman");
        ActionPointSystem.restore(u);
        expect(u.actionPoints).toBe(getUnitBaseAp("castle:swordsman"));
    });

    it("sets actionPoints to base_ap + bonusAp", () => {
        const u = spawnUnit("castle:swordsman", 1);
        ActionPointSystem.restore(u);
        expect(u.actionPoints).toBe(getUnitBaseAp("castle:swordsman") + 1);
    });
});

describe("unitIsExhausted", () => {
    it("returns true when actionPoints is 0", () => {
        expect(unitIsExhausted({ actionPoints: 0 })).toBe(true);
    });

    it("returns false when actionPoints meets MOVE cost", () => {
        expect(unitIsExhausted({ actionPoints: AP_COST.MOVE })).toBe(false);
    });
});
```

---

## 8. `shared/tests/unitStatus.test.ts` — Replace `hasMoved`-based assertions

Replace the entire file:

```ts
import { unitIsExhausted } from "../src/game/units/unit-status";
import { AP_COST } from "../src/game/ActionPointSystem";

describe("unitIsExhausted", () => {
    it("returns true when actionPoints is 0", () => {
        expect(unitIsExhausted({ actionPoints: 0 })).toBe(true);
    });

    it("returns false when actionPoints meets MOVE cost", () => {
        expect(unitIsExhausted({ actionPoints: AP_COST.MOVE })).toBe(false);
    });

    it("returns false when actionPoints exceeds MOVE cost", () => {
        expect(unitIsExhausted({ actionPoints: AP_COST.MOVE + 1 })).toBe(false);
    });

    it("accepts a minimal structural object", () => {
        expect(unitIsExhausted({ actionPoints: 2 })).toBe(false);
        expect(unitIsExhausted({ actionPoints: 0 })).toBe(true);
    });
});
```

---

## Verification

1. `yarn workspace @runebound-tactics/shared tsc --noEmit` — zero errors
2. `yarn workspace @runebound-tactics/server tsc --noEmit` — zero errors
3. `yarn workspace @runebound-tactics/shared test` — all tests pass, including the updated `unitStatus.test.ts`
4. Start server + two clients; confirm units spawn with `actionPoints = 2` in the first Colyseus state patch
5. Issue `move_unit`; confirm `actionPoints` drops to 1 in the next patch and the unit can still attack
6. Issue `attack_unit`; confirm `actionPoints` drops to 0; a subsequent move or attack is rejected
7. Issue `end_turn`; confirm the incoming player's units show `actionPoints = 2` in the patch
8. Exhaust a unit then attempt a move; confirm the server drops the message silently
