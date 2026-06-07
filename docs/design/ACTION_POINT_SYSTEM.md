# Action Point System

Documents the `ActionPointSystem` class (BCOMP-112) and its integration into the server turn pipeline. After this lands, BCOMP-128 can add `base_ap + bonus_ap` restoration and synced health without touching game logic.

---

## Context

Unit exhaustion today is tracked via two booleans on `GameUnit`: `hasMoved` and `hasActed`. These are checked and set directly by `GameRoom` with no shared abstraction. `unit-status.ts` already marks its `unitIsExhausted()` predicate as the sole AP-transition point (AP-5 anchor) — once `actionPoints` is live, that predicate is the only file whose signature changes.

`ActionPointSystem` replaces the boolean model with an explicit AP budget: each unit starts its turn with `base_ap + bonus_ap` points and spends 1 per move and 1 per attack. The `hasMoved`/`hasActed` flags remain on the schema (for client display) but are no longer the source of truth for exhaustion.

---

## Architecture

`ActionPointSystem` is a pure static-method class in `shared/src/game/`, co-located with the other game logic modules. It does not extend `StateBase` or hold runtime state — it is a typed namespace for AP operations. Mutations are applied to caller-supplied unit objects via structural typing, matching the pattern of `computeAttackDamage`.

```
shared/src/game/
  ActionPointSystem.ts       ← new
  units/
    unit-stats.ts             ← add getUnitBaseAp()
    unit-status.ts            ← update unitIsExhausted() (AP-5 anchor)
  index.ts                    ← re-export ActionPointSystem + AP_COST
shared/src/schemas/
  GameState.ts                ← add actionPoints + bonusAp to GameUnit
server/src/rooms/
  GameRoom.ts                 ← integrate at 5 call sites
shared/tests/
  actionPointSystem.test.ts   ← new
```

---

## Schema Changes — GameUnit

Two new Colyseus-synced fields in `shared/src/schemas/GameState.ts`:

```typescript
/** Current action points. Decrements per move/attack; restored at turn start. */
@type("int32") actionPoints: number = 0;

/** Bonus AP stacked on top of base_ap at turn-start restore. Default 0. */
@type("int32") bonusAp: number = 0;
```

`base_ap` per unit type is a static lookup in `unit-stats.ts` (not in schema, same pattern as movement/attack/defense). Both fields satisfy BCOMP-128 AC: "action_points starts each unit turn at base_ap + bonus_ap; decrements per action; cannot go below 0; synced in Colyseus game state."

---

## New Stat Helper — unit-stats.ts

Add after the existing `UNIT_DEFENSE` block:

```typescript
const UNIT_BASE_AP: Record<string, number> = {
    "castle:swordsman":         2,
    "castle:archer":            2,
    "castle:paladin":           2,
    "castle:cavalier":          2,
    "castle:griffin":           2,
    "necropolis:skeleton":      2,
    "necropolis:death_knight":  2,
    "necropolis:vampire":       2,
    "necropolis:ghost":         2,
    "necropolis:zombie":        2,
};

const DEFAULT_BASE_AP = 2;

export function getUnitBaseAp(unitType: UnitTypeId): number {
    return UNIT_BASE_AP[unitType] ?? DEFAULT_BASE_AP;
}
```

Default is 2 (1 move + 1 attack per turn, preserving the current 1-AP exhaustion model). Per-unit variation goes in this table only.

---

## ActionPointSystem Class

**File:** `shared/src/game/ActionPointSystem.ts`

```typescript
import { getUnitBaseAp, type UnitTypeId } from "./units/unit-stats";

export const AP_COST = {
    MOVE:   1,
    ATTACK: 1,
} as const;

export class ActionPointSystem {
    /** True if the unit has enough AP to pay `cost`. */
    static canAfford(unit: { actionPoints: number }, cost: number): boolean {
        return unit.actionPoints >= cost;
    }

    /** Deduct `cost` AP from the unit, clamped to 0. */
    static deduct(unit: { actionPoints: number }, cost: number): void {
        unit.actionPoints = Math.max(0, unit.actionPoints - cost);
    }

    /**
     * Restore unit AP to base_ap + bonus_ap at the start of their turn.
     * Reads base_ap from the static unit-stats table.
     */
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

**Design notes:**
- `canAfford` is a pure predicate — no mutation, safe to call in validation paths.
- `deduct` clamps to 0 (satisfies BCOMP-128 "cannot go below 0" AC).
- `restore` encapsulates the `base_ap + bonus_ap` formula (BCOMP-128 AC) — callers do not compute the formula themselves.
- `AP_COST` is exported so `unit-status.ts` and `GameRoom` share the same constants.

---

## unit-status.ts Update (AP-5 anchor)

Replace the existing `unitIsExhausted` function and import:

```typescript
import { AP_COST } from "../ActionPointSystem";

export function unitIsExhausted(unit: { actionPoints: number }): boolean {
    return unit.actionPoints < AP_COST.MOVE;
}
```

The structural parameter type changes from `{ hasMoved: boolean }` to `{ actionPoints: number }`. All callers (`GameRoom._rebuildReachabilityCache`, reconciler, selection system) pass a `GameUnit` or a plain-object snapshot — both shapes will have `actionPoints` once the schema change is applied.

---

## GameRoom Integration

Five call sites in `server/src/rooms/GameRoom.ts`.

### 1. Add imports

```diff
 import {
+    ActionPointSystem,
+    AP_COST,
     GamePlayerSlot,
     GameState,
     GameUnit,
     // ... existing imports
 } from "@runebound-tactics/shared";
```

### 2. move_unit handler — replace hasMoved guard with AP check

```diff
-        if (unit.hasMoved) return;
+        if (!ActionPointSystem.canAfford(unit, AP_COST.MOVE)) return;
         // ... reachability validation unchanged ...
         unit.x = payload.x;
         unit.y = payload.y;
         unit.hasMoved = true;
+        ActionPointSystem.deduct(unit, AP_COST.MOVE);
```

`unit.hasMoved = true` is kept for backwards-compatible client display.

### 3. _handleAttack() — deduct AP on successful attack commit

```diff
         // 1-AP exhaustion: flip on any successful attack.
         attacker.hasMoved = true;
         attacker.hasActed = true;
+        ActionPointSystem.deduct(attacker, AP_COST.ATTACK);
```

`hasMoved`/`hasActed` flags are kept for client display; AP is the new exhaustion signal.

### 4. _performTurnAdvance() — restore AP alongside flag reset

```diff
         for (const unit of this.state.units.values()) {
             if (unit.ownerId === this.state.currentTurnId) {
                 unit.hasMoved = false;
                 unit.hasActed = false;
+                ActionPointSystem.restore(unit);
             }
         }
```

### 5. _startGame() / unit spawn — initialise AP on creation

After constructing each `GameUnit` (in the unit-spawn loop), call:

```typescript
ActionPointSystem.restore(unit);
```

This sets `actionPoints` to `base_ap + bonusAp` (0 by default) from the first state patch, so clients never see `actionPoints = 0` for a fresh, unexhausted unit.

---

## Export Wiring

In `shared/src/game/index.ts`, add:

```typescript
export { ActionPointSystem, AP_COST } from "./ActionPointSystem";
```

`getUnitBaseAp` is already re-exported via `export * from "./units/unit-stats"`.

---

## Tests

**File:** `shared/tests/actionPointSystem.test.ts`

Minimum coverage:

| Case | Assertion |
|---|---|
| `canAfford` — sufficient AP | returns `true` |
| `canAfford` — exact match | returns `true` |
| `canAfford` — insufficient AP | returns `false` |
| `deduct` — normal spend | `actionPoints` decrements by cost |
| `deduct` — over-spend clamp | `actionPoints` lands at 0, not negative |
| `restore` — sets base_ap + bonusAp | `actionPoints === getUnitBaseAp(type) + bonusAp` |
| `restore` — bonusAp = 0 (default) | `actionPoints === getUnitBaseAp(type)` |
| `unitIsExhausted` — AP = 0 | returns `true` |
| `unitIsExhausted` — AP ≥ MOVE cost | returns `false` |

---

## Verification

1. `yarn workspace @runebound-tactics/shared tsc --noEmit` — zero errors
2. `yarn workspace @runebound-tactics/server tsc --noEmit` — zero errors
3. `yarn workspace @runebound-tactics/shared test` — all tests pass (including existing `unitStatus.test.ts`)
4. Start server + two clients; confirm units spawn with `actionPoints = 2` in first state patch
5. Issue `move_unit`; confirm `actionPoints` drops to 1 in next patch and unit can still attack
6. Issue `attack_unit`; confirm `actionPoints` drops to 0; subsequent move/attack rejected
7. Issue `end_turn`; confirm next player's units show `actionPoints = 2` in patch
8. Exhaust a unit then attempt move; confirm server drops the message silently
