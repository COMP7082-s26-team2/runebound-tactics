# Implementation Plan: Unit Attribute Data Model

Implements the attribute schema described in [`docs/design/UNIT_ATTRIBUTE_DATA_MODEL.md`](../design/UNIT_ATTRIBUTE_DATA_MODEL.md).

---

## Files

| File | Status | Change |
|---|---|---|
| `shared/src/types/game.ts` | Modify | Add `DamageType` type |
| `shared/src/schemas/GameState.ts` | Modify | Replace `maxHp` with base/bonus numeric fields; add `damageType` and `weakness` to `GameUnit` |
| `shared/src/game/units/unit-stats.ts` | Modify | Add base health, base AP, damage type, and weakness seed tables; add `getEffective*` helpers; update `computeAttackDamage` |
| `server/src/rooms/GameRoom.ts` | Modify | Populate new schema fields at unit spawn; remove hardcoded `hp`/`maxHp`; replace `computeAttackDamage` call signature |
| `shared/tests/unitAttributes.test.ts` | **New** | Unit tests for `getEffective*` helpers, no-negative validation, and default weakness table |

---

## 1. `shared/src/types/game.ts` — Add `DamageType`

```diff
+ export type DamageType = "melee" | "range" | "cavalry" | "pure";
```

---

## 2. `shared/src/schemas/GameState.ts` — Extend `GameUnit`

Import `ArraySchema` and add the new fields. Remove `maxHp` (superseded by `baseMaxHealth + bonusMaxHealth`).

```diff
- import { MapSchema, Schema, type } from "@colyseus/schema";
+ import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
```

Inside `GameUnit`:

```diff
- /** Current hit points. */
- @type("int32") hp: number = 0;
-
- /** Maximum hit points. */
- @type("int32") maxHp: number = 0;
+ /** Current hit points. Managed by BCOMP-128. */
+ @type("int32") hp: number = 0;
+
+ @type("int32") baseMaxHealth: number = 0;
+ @type("int32") bonusMaxHealth: number = 0;
+ @type("int32") baseAttackDamage: number = 0;
+ @type("int32") bonusAttackDamage: number = 0;
+ @type("int32") baseAp: number = 0;
+ @type("int32") bonusAp: number = 0;
+ @type("int32") baseMovement: number = 0;
+ @type("int32") bonusMovement: number = 0;
+ @type("int32") baseDefense: number = 0;
+ @type("int32") bonusDefense: number = 0;
+ @type("string") damageType: string = "";
+ @type(["string"]) weakness = new ArraySchema<string>();
```

Remove the `maxHp` jsdoc comment entirely.

---

## 3. `shared/src/game/units/unit-stats.ts` — Seed tables and helpers

### Add import

```diff
+ import type { DamageType } from "../types/game";
```

> Note: `import type` keeps this a pure-JS-compatible module at runtime; no Colyseus dependency.

### Add seed tables (after existing `UNIT_DEFENSE` block)

```ts
const UNIT_BASE_HEALTH: Record<string, number> = {
    "castle:swordsman":        30,
    "castle:archer":           20,
    "castle:paladin":          40,
    "castle:cavalier":         30,
    "castle:griffin":          25,
    "necropolis:skeleton":     20,
    "necropolis:death_knight": 40,
    "necropolis:vampire":      30,
    "necropolis:ghost":        20,
    "necropolis:zombie":       35,
};

const DEFAULT_BASE_HEALTH = 25;

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

const UNIT_DAMAGE_TYPE: Record<string, DamageType> = {
    "castle:swordsman":        "melee",
    "castle:archer":           "range",
    "castle:paladin":          "melee",
    "castle:cavalier":         "cavalry",
    "castle:griffin":          "range",
    "necropolis:skeleton":     "melee",
    "necropolis:death_knight": "melee",
    "necropolis:vampire":      "melee",
    "necropolis:ghost":        "pure",
    "necropolis:zombie":       "melee",
};

const DEFAULT_WEAKNESS: Record<DamageType, DamageType[]> = {
    melee:   ["cavalry"],
    cavalry: ["range"],
    range:   ["melee"],
    pure:    [],
};
```

### Add getter functions (after existing `getUnitDefense`)

```ts
export function getUnitBaseHealth(unitType: UnitTypeId): number {
    return UNIT_BASE_HEALTH[unitType] ?? DEFAULT_BASE_HEALTH;
}

export function getUnitBaseAp(unitType: UnitTypeId): number {
    return UNIT_BASE_AP[unitType] ?? DEFAULT_BASE_AP;
}

export function getUnitDamageType(unitType: UnitTypeId): DamageType | null {
    return UNIT_DAMAGE_TYPE[unitType] ?? null;
}

export function getUnitDefaultWeakness(unitType: UnitTypeId): DamageType[] {
    const dt = getUnitDamageType(unitType);
    return dt !== null ? DEFAULT_WEAKNESS[dt] : [];
}
```

### Add effective-stat helpers (after getters)

```ts
export function getEffectiveMaxHealth(u: {
    baseMaxHealth: number;
    bonusMaxHealth: number;
}): number {
    return Math.max(0, u.baseMaxHealth + u.bonusMaxHealth);
}

export function getEffectiveAttack(u: {
    baseAttackDamage: number;
    bonusAttackDamage: number;
}): number {
    return Math.max(0, u.baseAttackDamage + u.bonusAttackDamage);
}

export function getEffectiveDefense(u: {
    baseDefense: number;
    bonusDefense: number;
}): number {
    return Math.max(0, u.baseDefense + u.bonusDefense);
}

export function getEffectiveMovement(u: {
    baseMovement: number;
    bonusMovement: number;
}): number {
    return Math.max(0, u.baseMovement + u.bonusMovement);
}

export function getEffectiveAp(u: {
    baseAp: number;
    bonusAp: number;
}): number {
    return Math.max(0, u.baseAp + u.bonusAp);
}
```

### Update `computeAttackDamage`

Replace the current unit-type-string signature with a structural one so it works directly with schema objects:

```diff
- export function computeAttackDamage(
-     attackerType: UnitTypeId,
-     defenderType: UnitTypeId,
- ): number {
-     const atk = getUnitAttack(attackerType);
-     const def = getUnitDefense(defenderType);
-     return Math.max(1, atk - def);
- }
+ export function computeAttackDamage(
+     attacker: { baseAttackDamage: number; bonusAttackDamage: number },
+     defender: { baseDefense: number; bonusDefense: number },
+ ): number {
+     return Math.max(1, getEffectiveAttack(attacker) - getEffectiveDefense(defender));
+ }
```

> `getUnitAttack` and `getUnitDefense` remain — they are still used to seed base values at spawn.

---

## 4. `server/src/rooms/GameRoom.ts` — Populate fields at spawn

### Update imports

```diff
- import { computeAttackDamage, getUnitMovement } from "runebound-shared/game/units/unit-stats";
+ import {
+     computeAttackDamage,
+     getUnitAttack,
+     getUnitBaseAp,
+     getUnitBaseHealth,
+     getUnitDefaultWeakness,
+     getUnitDefense,
+     getUnitDamageType,
+     getUnitMovement,
+ } from "runebound-shared/game/units/unit-stats";
```

> Adjust the import path to match the project's actual alias if different.

### Update unit spawn block (currently around line 271)

```diff
  for (let j = 0; j < unitTypes.length; j++) {
      const unit = new GameUnit();
      unit.unitId  = `${sessionId}:u${j + 1}`;
      unit.ownerId = sessionId;
      unit.unitType = unitTypes[j]!;
      unit.x = 2 + j * 2;
      unit.y = row;
-     unit.hp    = 30;
-     unit.maxHp = 30;
+
+     unit.baseMaxHealth    = getUnitBaseHealth(unit.unitType);
+     unit.baseAttackDamage = getUnitAttack(unit.unitType);
+     unit.baseDefense      = getUnitDefense(unit.unitType);
+     unit.baseMovement     = getUnitMovement(unit.unitType);
+     unit.baseAp           = getUnitBaseAp(unit.unitType);
+     // bonus_* fields remain 0 (status effect system not yet implemented)
+
+     unit.hp = unit.baseMaxHealth;
+
+     const dt = getUnitDamageType(unit.unitType);
+     unit.damageType = dt ?? "";
+     for (const w of getUnitDefaultWeakness(unit.unitType)) {
+         unit.weakness.push(w);
+     }
+
      unit.hasMoved = false;
      unit.hasActed = false;
      this.state.units.set(unit.unitId, unit);
  }
```

### Update `computeAttackDamage` call (currently around line 358)

```diff
- const damage = computeAttackDamage(attacker.unitType, target.unitType);
+ const damage = computeAttackDamage(attacker, target);
```

---

## 5. `shared/tests/unitAttributes.test.ts` — New test file

```ts
import {
    getEffectiveMaxHealth,
    getEffectiveAttack,
    getEffectiveDefense,
    getEffectiveMovement,
    getEffectiveAp,
    getUnitDefaultWeakness,
    getUnitDamageType,
} from "../src/game/units/unit-stats";

describe("effective-stat helpers", () => {
    it("returns base + bonus", () => {
        expect(getEffectiveMaxHealth({ baseMaxHealth: 30, bonusMaxHealth: 5 })).toBe(35);
        expect(getEffectiveAttack({ baseAttackDamage: 6, bonusAttackDamage: 2 })).toBe(8);
        expect(getEffectiveDefense({ baseDefense: 3, bonusDefense: 1 })).toBe(4);
        expect(getEffectiveMovement({ baseMovement: 3, bonusMovement: 1 })).toBe(4);
        expect(getEffectiveAp({ baseAp: 2, bonusAp: 1 })).toBe(3);
    });

    it("returns base when bonus is 0", () => {
        expect(getEffectiveMaxHealth({ baseMaxHealth: 30, bonusMaxHealth: 0 })).toBe(30);
        expect(getEffectiveAttack({ baseAttackDamage: 6, bonusAttackDamage: 0 })).toBe(6);
    });

    it("clamps to 0 when base + bonus would be negative", () => {
        expect(getEffectiveDefense({ baseDefense: 2, bonusDefense: -5 })).toBe(0);
        expect(getEffectiveAp({ baseAp: 2, bonusAp: -10 })).toBe(0);
    });

    it("returns 0 when both base and bonus are 0", () => {
        expect(getEffectiveMaxHealth({ baseMaxHealth: 0, bonusMaxHealth: 0 })).toBe(0);
    });
});

describe("RPS weakness mapping", () => {
    it("melee is weak to cavalry", () => {
        expect(getUnitDefaultWeakness("castle:swordsman")).toContain("cavalry");
    });

    it("cavalry is weak to range", () => {
        expect(getUnitDefaultWeakness("castle:cavalier")).toContain("range");
    });

    it("range is weak to melee", () => {
        expect(getUnitDefaultWeakness("castle:archer")).toContain("melee");
    });

    it("pure has no weakness", () => {
        expect(getUnitDefaultWeakness("necropolis:ghost")).toEqual([]);
    });

    it("unknown unit type returns empty weakness list", () => {
        expect(getUnitDefaultWeakness("unknown:unit")).toEqual([]);
    });
});

describe("damage type", () => {
    it("returns correct damage type for known units", () => {
        expect(getUnitDamageType("castle:swordsman")).toBe("melee");
        expect(getUnitDamageType("castle:cavalier")).toBe("cavalry");
        expect(getUnitDamageType("castle:archer")).toBe("range");
        expect(getUnitDamageType("necropolis:ghost")).toBe("pure");
    });

    it("returns null for unknown unit type", () => {
        expect(getUnitDamageType("unknown:unit")).toBeNull();
    });
});
```

---

## Merge note

The BCOMP-112 branch (`feature/bcomp-112-action-points-resource-system`) also adds `getUnitBaseAp` to `unit-stats.ts`. When both branches merge to `develop`, keep the BCOMP-127 version (which sources from `UNIT_BASE_AP`) and verify that `ActionPointSystem.restore()` still calls `getUnitBaseAp` correctly — the signature is unchanged.

---

## Verification

1. `pnpm -F shared tsc --noEmit` — no type errors in the shared package
2. `pnpm -F shared test` — all existing tests pass and `unitAttributes.test.ts` passes
3. `grep -r '\.maxHp' server/ shared/` — zero results (field removed)
4. Start the dev server and join a game; confirm via the Colyseus state inspector (or server logs) that spawned units have non-zero `baseMaxHealth`, `baseAttackDamage`, etc., all `bonus*` fields are `0`, `damageType` is populated, and `weakness` contains the expected entries
