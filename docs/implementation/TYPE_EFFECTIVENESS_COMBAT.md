# Implementation Plan: Type Effectiveness and Attribute Combat Damage

Implements the damage formula described in [`docs/design/TYPE_EFFECTIVENESS_COMBAT.md`](../design/TYPE_EFFECTIVENESS_COMBAT.md).

---

## Files

| File | Status | Change |
|---|---|---|
| `shared/src/game/units/unit-stats.ts` | Modify | Add `WEAKNESS_MULTIPLIER`; extend `computeAttackDamage` signature and formula |
| `client/src/lib/game/components/UnitStatsData.ts` | Modify | Add `damageType` and `weakness` fields |
| `client/src/lib/game/assets/multiplayerUnitMap.ts` | Modify | Populate `damageType` and `weakness` in `unitTypeToStats` |
| `client/src/lib/game/systems/CombatSystem.ts` | Modify | Replace inline formula with `computeAttackDamage` from shared |
| `shared/tests/unitAttributes.test.ts` | Modify | Add type effectiveness cases to the existing test file |

`server/src/rooms/GameRoom.ts` calls `computeAttackDamage(attacker, target)` where `attacker` and `target` are `GameUnit` schema objects. Because `GameUnit` already carries `damageType` and `weakness`, no call-site change is needed on the server once the signature is extended.

---

## 1. `shared/src/game/units/unit-stats.ts` — Add multiplier and update formula

### Add constant (above `computeAttackDamage`)

```diff
+export const WEAKNESS_MULTIPLIER = 1.5;
+
 /**
  * Server-authoritative damage formula.
```

### Extend `computeAttackDamage` signature and branch on damage case

```diff
 export function computeAttackDamage(
-    attacker: { baseAttackDamage: number; bonusAttackDamage: number },
-    defender: { baseDefense: number; bonusDefense: number },
+    attacker: { baseAttackDamage: number; bonusAttackDamage: number; damageType: string },
+    defender: { baseDefense: number; bonusDefense: number; weakness: readonly string[] },
 ): number {
-    return Math.max(1, getEffectiveAttack(attacker) - getEffectiveDefense(defender));
+    const effectiveAttack = getEffectiveAttack(attacker);
+    const effectiveDefense = getEffectiveDefense(defender);
+
+    if (attacker.damageType === "pure") {
+        return effectiveAttack;
+    }
+
+    if (!attacker.damageType) {
+        return Math.max(1, effectiveAttack - effectiveDefense);
+    }
+
+    const multiplier = defender.weakness.includes(attacker.damageType)
+        ? WEAKNESS_MULTIPLIER
+        : 1;
+    return Math.max(1, Math.floor(effectiveAttack * multiplier) - effectiveDefense);
 }
```

---

## 2. `client/src/lib/game/components/UnitStatsData.ts` — Add `damageType` and `weakness`

```diff
 export type UnitStatsData = {
     name: string;
     health: number;
     attack: number;
     defense: number;
     movement: number;
     attackRange: number;
+    damageType: string;
+    weakness: readonly string[];
 };
```

---

## 3. `client/src/lib/game/assets/multiplayerUnitMap.ts` — Populate new fields

### Add imports

```diff
-import { getUnitMovement } from "@runebound-tactics/shared";
+import {
+    getUnitMovement,
+    getUnitDamageType,
+    getUnitDefaultWeakness,
+} from "@runebound-tactics/shared";
```

### Populate fields in `unitTypeToStats`

```diff
     return {
         name,
         health: 30,
         attack: 5,
         defense: 3,
         movement: getUnitMovement(unitType),
         attackRange: 1,
+        damageType: getUnitDamageType(unitType) ?? "",
+        weakness: getUnitDefaultWeakness(unitType),
     };
```

---

## 4. `client/src/lib/game/systems/CombatSystem.ts` — Use shared formula

### Add import

```diff
+import { computeAttackDamage } from "@runebound-tactics/shared";
+
 import { EntityId, World } from "@/lib/engine";
```

### Replace inline formula in `resolveAttack`

```diff
-        const damage = Math.max(0, attacker.attack - defender.defense)
+        const damage = computeAttackDamage(
+            {
+                baseAttackDamage: attacker.attack,
+                bonusAttackDamage: 0,
+                damageType: attacker.damageType,
+            },
+            {
+                baseDefense: defender.defense,
+                bonusDefense: 0,
+                weakness: defender.weakness,
+            },
+        );
```

`UnitStatsData` stores effective values (not base/bonus split), so `bonusAttackDamage` and `bonusDefense` are passed as `0` — the effective values are already in `attacker.attack` and `defender.defense`.

---

## 5. `shared/tests/unitAttributes.test.ts` — Add type effectiveness cases

Add a new `describe` block at the end of the existing file.

```ts
describe("computeAttackDamage — type effectiveness", () => {
    const makeAttacker = (
        baseAttackDamage: number,
        damageType: string,
    ) => ({ baseAttackDamage, bonusAttackDamage: 0, damageType });

    const makeDefender = (
        baseDefense: number,
        weakness: string[],
    ) => ({ baseDefense, bonusDefense: 0, weakness });

    it("physical with weakness applies 1.5× multiplier before defense", () => {
        // floor(5 × 1.5) − 2 = 7 − 2 = 5
        expect(computeAttackDamage(
            makeAttacker(5, "cavalry"),
            makeDefender(2, ["cavalry"]),
        )).toBe(5);
    });

    it("physical without weakness uses flat attack minus defense", () => {
        // 5 − 2 = 3
        expect(computeAttackDamage(
            makeAttacker(5, "melee"),
            makeDefender(2, ["cavalry"]),
        )).toBe(3);
    });

    it("physical damage floors at 1 when attack is less than defense", () => {
        expect(computeAttackDamage(
            makeAttacker(2, "melee"),
            makeDefender(10, []),
        )).toBe(1);
    });

    it("pure damage bypasses defense entirely", () => {
        expect(computeAttackDamage(
            makeAttacker(4, "pure"),
            makeDefender(10, []),
        )).toBe(4);
    });

    it("pure damage can be 0 when effectiveAttack is 0", () => {
        expect(computeAttackDamage(
            makeAttacker(0, "pure"),
            makeDefender(10, []),
        )).toBe(0);
    });

    it("null damage type applies defense but no weakness interaction", () => {
        // 5 − 2 = 3 (weakness list ignored)
        expect(computeAttackDamage(
            makeAttacker(5, ""),
            makeDefender(2, ["melee"]),
        )).toBe(3);
    });

    it("null damage type floors at 1", () => {
        expect(computeAttackDamage(
            makeAttacker(1, ""),
            makeDefender(10, []),
        )).toBe(1);
    });

    it("RPS triangle — cavalry beats melee", () => {
        const cavalry = makeAttacker(5, "cavalry");
        const meleeUnit = makeDefender(2, ["cavalry"]);
        expect(computeAttackDamage(cavalry, meleeUnit)).toBeGreaterThan(
            computeAttackDamage(makeAttacker(5, "cavalry"), makeDefender(2, [])),
        );
    });
});
```

---

## Verification

1. `pnpm --filter @runebound-tactics/shared tsc --noEmit` — zero type errors
2. `pnpm --filter @runebound-tactics/client tsc --noEmit` — zero type errors
3. `pnpm --filter @runebound-tactics/shared test` — all existing + new `computeAttackDamage` cases pass
4. Start server + two clients; issue a Cavalry attack against a Melee unit — confirm server logs show damage ≥ `floor(attack × 1.5) − defense` and the broadcast value matches
5. Issue a Ghost (pure) attack — confirm damage equals Ghost's raw attack value regardless of defender defense
6. Issue a Melee attack against a Cavalry unit (no weakness match) — confirm damage equals `max(1, attack − defense)` with no multiplier
