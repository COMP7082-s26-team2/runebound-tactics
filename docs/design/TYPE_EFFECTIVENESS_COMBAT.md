# Type Effectiveness and Attribute Combat Damage

Documents the three damage-case model, the RPS weakness multiplier, and the updated `computeAttackDamage` formula. Extends the attribute data model established in `UNIT_ATTRIBUTE_DATA_MODEL.md`.

Ticket: BCOMP-129

---

## Architecture Overview

| Layer | Location | Responsibility |
|---|---|---|
| Constant | `shared/src/game/units/unit-stats.ts` | `WEAKNESS_MULTIPLIER` — single authoritative value for the bonus |
| Formula | `shared/src/game/units/unit-stats.ts` — `computeAttackDamage` | Branches on damage case; applies multiplier before defense; returns final `damage_taken` |
| Caller (server) | `server/src/rooms/GameRoom.ts` — `_resolvePendingAttack` | Passes attacker + defender schema objects directly to the formula |
| Caller (client) | `client/src/lib/game/systems/CombatSystem.ts` — `resolveAttack` | Mirrors the server formula for local prediction |

The multiplier and formula live in `unit-stats.ts` alongside all other combat seed data and helpers. No new file is needed.

---

## Damage Cases

Every attack resolves to one of three cases based on the **attacker's effective `damageType`** at the moment damage resolves.

| Case | Condition | Formula |
|---|---|---|
| **Physical** | `damageType` is `"melee"`, `"range"`, or `"cavalry"` | `max(1, floor(effectiveAttack × multiplier) − effectiveDefense)` |
| **Pure** | `damageType` is `"pure"` | `effectiveAttack` (bypasses defense; no weakness interaction) |
| **Null** | `damageType` is `""` or `null` | `max(1, effectiveAttack − effectiveDefense)` (defense applies; no weakness) |

---

## Type Effectiveness Multiplier

For physical attacks, check whether the **attacker's `damageType`** appears in the **defender's `weakness` array**.

| Condition | Multiplier |
|---|---|
| Attacker's `damageType` ∈ defender's `weakness` | `1.5` |
| No match | `1.0` |

The multiplier is applied to `effectiveAttack` before defense subtraction. `Math.floor` is applied to the scaled attack value only, keeping the defense subtraction clean and free of rounding interaction.

```
// Physical — weakness hit
damage = max(1, floor(effectiveAttack × 1.5) − effectiveDefense)

// Physical — no weakness
damage = max(1, effectiveAttack − effectiveDefense)

// Pure
damage = effectiveAttack

// Null type
damage = max(1, effectiveAttack − effectiveDefense)
```

The minimum-damage floor of `1` applies only to Physical and Null cases. Pure damage can be `0` when `effectiveAttack` is `0`.

---

## RPS Weakness Triangle

The weakness mapping is unchanged from `UNIT_ATTRIBUTE_DATA_MODEL.md`.

| Defender's `damageType` | Weak to |
|---|---|
| `"melee"` | `"cavalry"` |
| `"cavalry"` | `"range"` |
| `"range"` | `"melee"` |
| `"pure"` | _(none)_ |

A unit with `damageType = ""` has an empty `weakness` list and is never hit for a bonus.

---

## Effective Damage Type Source

The attacker's damage type is `unit.damageType` as set at spawn. The card system (future) may override it before the reaction window closes. The formula always reads the **resolved** value — whatever is on the schema object at damage resolution time. For v1, no card overrides exist, so effective damage type equals the spawned `damageType`.

---

## Damage Visibility

The final `damage_taken` value (after all formula steps) is broadcast to all connected players after the reaction window closes. No intermediate values are surfaced to clients.

---

## Design Decisions

| Question | Decision | Rationale |
|---|---|---|
| Where does `WEAKNESS_MULTIPLIER` live? | `unit-stats.ts` | Same file as all other combat seed data; one place to tune during balancing |
| Multiplier applied before or after defense? | Before — `floor(attack × mult) − defense` | Weakness bonus degrades as defense rises, adding a strategic counter to stacking defense against a type disadvantage |
| When is `Math.floor` applied? | To scaled attack only, before defense subtraction | Avoids rounding artifacts in the defense subtraction; keeps the two steps independent |
| Minimum for pure? | None — `effectiveAttack` verbatim | Pure bypasses all mitigation; a zero-attack unit doing zero damage is correct and not worth a special case |
| `computeAttackDamage` signature change | Extend structural types with `damageType: string` on attacker and `weakness: readonly string[]` on defender | Structural — no full schema import needed in shared; both server and client schema objects satisfy the type |
