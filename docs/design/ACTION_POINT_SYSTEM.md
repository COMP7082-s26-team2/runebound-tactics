# Action Point System

Documents the `ActionPointSystem` class (BCOMP-112) and how it integrates with `GameRoom`, `GameUnit`, and the exhaustion predicate.

---

## Architecture Overview

| Component | Lives in | Responsibility |
|---|---|---|
| `ActionPointSystem` | `shared/src/game/ActionPointSystem.ts` | Stateless, pure operations — `canAfford`, `deduct`, `restore` — applied to any structurally compatible unit object. Exports `AP_COST` constants consumed by all callers. |
| `getUnitBaseAp()` | `shared/src/game/units/unit-stats.ts` | Static per-unit-type AP lookup (same pattern as `getUnitMovement`/`getUnitAttack`/`getUnitDefense`). Not in schema. |
| `unitIsExhausted()` | `shared/src/game/units/unit-status.ts` | Sole exhaustion predicate. AP-5 anchor: this is the only file whose signature changes when AP lands. Reachability cache and selection system both call this; neither reads `actionPoints` directly. |
| `GameUnit` additions | `shared/src/schemas/GameState.ts` | Two new Colyseus-synced fields: `actionPoints` and `bonusAp`. |

`ActionPointSystem` does not extend `StateBase`, holds no runtime state, and has no dependency on Colyseus or the server. It is a typed namespace for AP operations; callers mutate the unit objects they supply.

---

## AP Model

Each unit starts its turn with a budget of **`base_ap + bonus_ap`** action points.

- **`base_ap`** — per-unit-type constant from `unit-stats.ts`. All current units default to **2** (1 move + 1 attack), preserving the existing 1-AP exhaustion behaviour.
- **`bonus_ap`** — per-unit runtime field on `GameUnit`, default **0**. Reserved for the BCOMP-128 item/ability system; `restore()` already accounts for it.

**Spending:**
- Moving costs `AP_COST.MOVE` (1).
- Attacking costs `AP_COST.ATTACK` (1).
- AP cannot go below 0 (`deduct` clamps).

**Exhaustion:** a unit is considered exhausted when `actionPoints < AP_COST.MOVE`. The `unitIsExhausted()` predicate encodes this check; no other code should read `actionPoints` for exhaustion purposes.

**Restoring:** `ActionPointSystem.restore(unit)` sets `unit.actionPoints = base_ap + unit.bonusAp`. It is called at two points: when a unit's owner's turn begins, and when a unit is first spawned.

**`hasMoved` / `hasActed` flags** remain on `GameUnit` for client display purposes only. They are no longer the source of truth for exhaustion.

---

## `ActionPointSystem` API

| Method | Signature | Guarantees |
|---|---|---|
| `canAfford` | `(unit, cost) → boolean` | Pure predicate; no mutation. Safe to call in any validation path. |
| `deduct` | `(unit, cost) → void` | Decrements `unit.actionPoints` by `cost`, clamped to 0. Never produces a negative value. |
| `restore` | `(unit) → void` | Sets `unit.actionPoints` to `getUnitBaseAp(unit.unitType) + unit.bonusAp`. Encapsulates the restore formula so callers never compute it inline. |

**`AP_COST` constants:**

| Key | Value | Used by |
|---|---|---|
| `MOVE` | 1 | `move_unit` handler, `unitIsExhausted` |
| `ATTACK` | 1 | `_handleAttack()` |

---

## Schema Data Model — GameUnit Additions

Two new Colyseus-synced fields added to `GameUnit` in `shared/src/schemas/GameState.ts`:

| Field | Type | Default | Description |
|---|---|---|---|
| `actionPoints` | `int32` | `0` | Current AP. Decrements on move/attack; restored at turn start. Synced to all clients. |
| `bonusAp` | `int32` | `0` | Bonus AP added at restore time. Default 0 until an ability/item system sets it. |

`base_ap` is intentionally **not** in the schema — it is a static, per-unit-type constant (see `getUnitBaseAp()`), the same pattern used for movement range, attack, and defense values.

**`base_ap` values (all unit types):**

| Faction | Unit | `base_ap` |
|---|---|---|
| castle | swordsman, archer, paladin, cavalier, griffin | 2 |
| necropolis | skeleton, death_knight, vampire, ghost, zombie | 2 |

All units default to 2. Per-unit variation is introduced by editing only the `UNIT_BASE_AP` table in `unit-stats.ts`.

---

## Integration Touchpoints

`ActionPointSystem` is called by `GameRoom` at five points:

| Component | Trigger | AP Operation | Notes |
|---|---|---|---|
| `move_unit` handler | Valid move accepted | `canAfford` guard → `deduct(MOVE)` | Replaces `if (unit.hasMoved)` guard; `unit.hasMoved = true` is kept for client display |
| `_handleAttack()` | Successful attack committed | `deduct(ATTACK)` | `hasMoved = hasActed = true` kept for client display |
| `_performTurnAdvance()` | Turn advances to next player | `restore()` per unit owned by the incoming player | Alongside existing `hasMoved`/`hasActed` reset |
| `_spawnInitialUnits()` | Unit constructed at game start | `restore()` | Ensures the first Colyseus patch never shows `actionPoints = 0` for a fresh unit |
| `unitIsExhausted()` | Reachability cache rebuild + selection guard | Reads `actionPoints < AP_COST.MOVE` | Called by `_rebuildReachabilityCache`; AP-5 anchor |

---

## Placeholder / Extension Points

- **`bonusAp`** is always `0` until the BCOMP-128 item/ability system writes to it. The `restore()` formula already handles any nonzero value; no further changes are needed when that system lands.
- **Per-unit `base_ap` variation** is introduced by editing the `UNIT_BASE_AP` record in `unit-stats.ts` only — no schema or logic changes required.

---

## Edge Cases & Invariants

- `deduct` clamps to 0. A double-spend (e.g., a bug that calls `deduct` twice) leaves `actionPoints` at 0, not negative. This means `unitIsExhausted()` will correctly block further actions.
- The `move_unit` handler's `canAfford` guard fires before any state mutation. If the unit cannot afford the move, nothing changes.
- `_handleAttack()` commits `deduct(ATTACK)` only after both halves of the transaction (move-half + attack validation) succeed. A failed attack attempt leaves AP untouched.
- `unitIsExhausted()`'s structural parameter type changes from `{ hasMoved: boolean }` to `{ actionPoints: number }`. All callers pass a live `GameUnit` or a plain-object snapshot; both shapes carry `actionPoints` once the schema change is applied.
