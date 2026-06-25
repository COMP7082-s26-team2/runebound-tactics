# Unit Attribute Data Model

Documents the base/bonus attribute schema for `GameUnit`, the derived effective-stat model, and the damage-type/weakness system.

---

## Design Decision: Where Do Attributes Live?

Two approaches were considered for storing unit attributes.

| Approach | Pro | Con |
|---|---|---|
| **All fields on `GameUnit`** (chosen) | Consistent with ECS-oriented architecture — entities are flat data bags, not objects with behaviour; no mapping layer; client receives all attributes automatically via Colyseus delta sync | Schema grows large; base stats (which rarely change after spawn) are included in the synced state |
| **Separate domain `Unit` class** | Cleaner separation of concerns; base stats don't need to be on the wire after spawn | Architecturally foreign to both sides of the codebase; conflicts with the ECS model on the client; requires an extra translation layer between the domain object and the schema |

The codebase follows an ECS-oriented architecture throughout: on the server, `GameUnit extends Schema` is a flat data bag with no behaviour; on the client, `World` + `ComponentStore<T>` treats entities as bare IDs with data in component stores. A dedicated `Unit` class would introduce OOP encapsulation that has no precedent on either side. Placing all fields directly on `GameUnit` keeps the project consistent with that model.

Base stats only change at spawn; bonus stats only change on status effect application. Colyseus sends deltas, so fields that don't change add no ongoing bandwidth overhead.

---

## Architecture Overview

| Layer | Location | Responsibility |
|---|---|---|
| Schema | `shared/src/schemas/GameState.ts` — `GameUnit` | Synchronized numeric and categorical fields; serialized to/from Colyseus game state |
| Types | `shared/src/types/game.ts` | Compile-time `DamageType` union; no Colyseus dependency |
| Seed data | `shared/src/game/units/unit-stats.ts` | Per-unit-type base values and RPS weakness table; effective-stat helpers |
| Spawn site | `server/src/rooms/GameRoom.ts` | Reads seed data at unit creation and writes it into the schema; sole writer of base fields |

`bonus_*` fields default to `0` and are written exclusively by the (future) status effect system. No item system exists; all bonuses come from status effects only.

---

## Schema Fields

All fields live on `GameUnit extends Schema` and are synchronized to all clients via Colyseus delta encoding.

| Field | Colyseus type | Default | Notes |
|---|---|---|---|
| `baseMaxHealth` | `int32` | `0` | Set at spawn from seed data |
| `bonusMaxHealth` | `int32` | `0` | Written by status effect system only |
| `baseAttackDamage` | `int32` | `0` | Set at spawn from seed data |
| `bonusAttackDamage` | `int32` | `0` | Written by status effect system only |
| `baseAp` | `int32` | `0` | Set at spawn from seed data |
| `bonusAp` | `int32` | `0` | Written by status effect system only |
| `baseMovement` | `int32` | `0` | Set at spawn from seed data |
| `bonusMovement` | `int32` | `0` | Written by status effect system only |
| `baseDefense` | `int32` | `0` | Set at spawn from seed data |
| `bonusDefense` | `int32` | `0` | Written by status effect system only |
| `damageType` | `string` | `""` | `DamageType` value or `""` for pure/no-type |
| `weakness` | `ArraySchema<string>` | `[]` | List of `DamageType` strings this unit is weak to; populated from RPS map at spawn |

`hp` (current health) is retained from the existing schema and managed by BCOMP-128. `maxHp` is removed; effective max health is derived from `baseMaxHealth + bonusMaxHealth`.

---

## Type Definitions

```ts
// shared/src/types/game.ts
export type DamageType = "melee" | "range" | "cavalry" | "pure";
```

`"pure"` damage has no weakness counter; it is never in any unit's `weakness` list.

---

## Derived Stats

Effective stats are never stored — they are computed on demand by helper functions in `unit-stats.ts`. Both server and client use the same shared helpers.

| Effective stat | Formula | Helper |
|---|---|---|
| Max health | `baseMaxHealth + bonusMaxHealth` | `getEffectiveMaxHealth(u)` |
| Attack damage | `baseAttackDamage + bonusAttackDamage` | `getEffectiveAttack(u)` |
| Action points | `baseAp + bonusAp` | `getEffectiveAp(u)` |
| Movement | `baseMovement + bonusMovement` | `getEffectiveMovement(u)` |
| Defense | `baseDefense + bonusDefense` | `getEffectiveDefense(u)` |

Each helper accepts a structural type (not a full `GameUnit`) so both live schema objects and plain-object snapshots are accepted without casting.

The existing damage formula remains:

```
damage = max(1, getEffectiveAttack(attacker) - getEffectiveDefense(defender))
```

---

## Validation

No negative attribute values are permitted. Enforcement is two-layered:

| Enforcement point | Mechanism |
|---|---|
| Spawn (base values) | `GameRoom` asserts all seeded values are `>= 0` at unit creation; throws if seed data is malformed |
| Runtime mutation (bonus values) | Status effect system clamps via `Math.max(0, base + bonus)` before writing; effective-stat helpers never produce a value below `0` |

`bonus_*` fields may temporarily be negative (e.g. a debuff) but effective-stat helpers always return `Math.max(0, base + bonus)`, ensuring no negative stat reaches game logic.

---

## RPS Weakness Mapping

The default weakness table follows a rock-paper-scissors triangle. Each unit's `weakness` list is populated from this map at spawn based on its `damageType`.

| Unit's `damageType` | Weak to |
|---|---|
| `"melee"` | `"cavalry"` |
| `"cavalry"` | `"range"` |
| `"range"` | `"melee"` |
| `"pure"` | _(none)_ |

A unit with `damageType = ""` (no type) also receives an empty `weakness` list.

Future: combat resolution will check whether the attacker's `damageType` appears in the defender's `weakness` list and apply a damage multiplier. That multiplier lives in the combat system, not here.

---

## Colyseus Serialization

`weakness` is an `ArraySchema<string>` rather than a plain array so Colyseus can track per-index deltas. On spawn the server pushes each weakness string into it; clients receive the populated list in the first state patch.

`damageType` is stored as a plain `string` field (not an enum) to satisfy Colyseus's `@type("string")` decorator. The `DamageType` union in `types/game.ts` enforces valid values at compile time on the server; the schema field itself accepts any string for wire-format flexibility.

All `int32` base and bonus fields participate in Colyseus delta sync — only changed fields are sent per patch. Because `bonus_*` fields default to `0` and are rarely mutated, they add negligible bandwidth overhead.

---

## Placeholder

`bonus_*` fields are intentionally inert until the status effect system is built. Until then:

- All `bonus_*` fields remain `0` for the lifetime of a unit
- No code path outside the (future) status effect system should write to them
- Effective-stat helpers already handle non-zero bonus values correctly when that system lands
