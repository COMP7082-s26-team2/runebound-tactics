# Gameplay Loop FSM

Documents the two-FSM architecture that drives the full gameplay loop.

---

## Architecture Overview

The gameplay loop is split across two separate state machines:

| Machine | Type | Phases | Responsibility |
|---|---|---|---|
| `GameState` | Inner | `idle`, `selected`, `awaiting-move`, `moved` | Per-unit interaction; driven by player clicks via `SelectionSystem` |
| `TurnFlow` | Outer | `action-phase`, `declare-end-turn`, `quick-play`, `combat`, `post-combat` | Turn pipeline; auto-advances through resolution after End Turn is declared |

`SelectionSystem` is only active while `TurnFlow` is in `action-phase`. The outer machine auto-advances through the three resolution phases and calls `TurnSystem.endTurn()`, which emits `turn:begin` on the shared `EventBus` to start the next player's turn.

---

## Phase Unions

**`TurnPhase`** (inner — `GameState`):
```ts
export type TurnPhase =
  | "idle"           // waiting for active player input
  | "selected"       // unit selected; showing movement (blue), attack-position (green), and attack (red) ranges
  | "awaiting-move"  // unit attacked in place; showing movement range before deselect
  | "moved";         // unit moved to attack-position tile; waiting to attack or deselect
```

**`TurnFlowPhase`** (outer — `TurnFlow`):
```ts
export type TurnFlowPhase =
  | "action-phase"      // inner GameState machine active; player selects/moves/attacks
  | "declare-end-turn"  // player clicked End Turn; kicks off resolution pipeline
  | "quick-play"        // placeholder: opponent response window (card system pending)
  | "combat"            // resolve pendingAttacks via CombatSystem
  | "post-combat";      // placeholder: unit death removal, gold award (gold system pending)
```

---

## Phase Transition Diagram

```
GridMovementScene.init()
  state.start("idle")              (inner FSM initialized)
  turnFlow.start("action-phase")   → action-phase.onEnter: state.transition("idle")
  eventBus.on("turn:begin", ...)   registered
  turnSystem.start("player1")      → emits "turn:begin"
    → listener: turnFlow.transition("action-phase")
         → action-phase.onEnter: state.transition("idle")
              → idle.onEnter: activePlayerId = "player1"

── ACTION PHASE (player1) ──────────────────────────────────────

Player clicks friendly unit
  └─ ownership check passes
  └─ state.transition("selected")
       └─ computes reachableTiles (blue) + reachableAttackableTiles (green) + attackableEntities (red)

Player clicks attackable enemy (red) while "selected"
  └─ _declareAttack(attacker, target) → state.pendingAttacks.push(...)
  └─ state.transition("awaiting-move") — reachableTiles recomputed for post-attack move

Player clicks green tile (reachableAttackableTile) while "selected"
  └─ unit moves to that tile
  └─ attackableEntities recomputed from new position via CombatSystem.computeAttackable()
  └─ state.transition("moved") — shows red attack targets from new position

Player clicks attackable enemy (red) while "moved"
  └─ _declareAttack(attacker, target) → state.pendingAttacks.push(...)
  └─ state.transition("idle")

Player clicks End Turn button
  └─ scene.endTurn() → turnFlow.transition("declare-end-turn")

── TURN RESOLUTION PIPELINE ────────────────────────────────────

declare-end-turn.onEnter
  └─ queueMicrotask → turnFlow.transition("quick-play")

quick-play.onEnter           [placeholder: card response window]
  └─ queueMicrotask → turnFlow.transition("combat")

combat.onEnter
  └─ for each state.pendingAttacks entry:
       combatSystem.resolveAttack(attackerId, targetId) → AttackResult
       if result.defenderDied → state.pendingDeaths.push(targetId)
       else → world.unitStats.set(targetId, { ...defender, health: result.newDefenderHp })
  └─ state.pendingAttacks = []
  └─ queueMicrotask → turnFlow.transition("post-combat")

post-combat.onEnter          [placeholder: gold resource system not yet implemented]
  └─ world.removeUnit() for each state.pendingDeaths
  └─ state.pendingDeaths = []
  └─ turnSystem.endTurn()
       └─ EventBus emits "turn:begin" (player2)
            └─ listener: turnFlow.transition("action-phase")
                 → action-phase.onEnter: state.transition("idle")
                      → idle.onEnter: activePlayerId = "player2"

── ACTION PHASE (player2) ──────────────────────────────────────
```

---

## CombatSystem Integration

`CombatSystem` (`src/lib/game/systems/CombatSystem.ts`) splits combat into two methods:

- `resolveAttack(attackerId, targetId): AttackResult` — pure computation; returns `{ damage, defenderDied, newDefenderHp }`. No side effects.
- `applyAttackResult(result, attackerId, targetId)` — originally removed dead units immediately. **Updated:** this method now only updates HP and never calls `world.removeUnit()`. Death removal is the exclusive responsibility of the `post-combat` phase.
- `computeAttackable(entityId): Set<EntityId>` — used by `SelectionSystem` during unit selection and after moves.

The `combat` phase in `TurnFlow` calls `resolveAttack()` to populate `pendingDeaths`, then handles HP updates inline. `post-combat` then calls `world.removeUnit()` for each entry in `pendingDeaths`, keeping a clean extension point for death animations or gold distribution.

---

## `pendingAttacks` Lifecycle

| Step | Location | What happens |
|---|---|---|
| Declaration (in place) | `SelectionSystem._declareAttack()` from `_handleSelectedClick()` | `{ attackerId, targetId }` pushed to `state.pendingAttacks` |
| Declaration (after move) | `SelectionSystem._declareAttack()` from `_handleMovedClick()` | Same push |
| Held | `state.pendingAttacks` | Survives through `declare-end-turn` and `quick-play` untouched |
| Resolution | `combat` phase `onEnter` (on `TurnFlow`) | `resolveAttack()` called per entry; HP updated or death queued; array cleared |
| Death removal | `post-combat` phase `onEnter` (on `TurnFlow`) | `world.removeUnit()` for each `pendingDeaths` entry; array cleared |

---

## Placeholder Phases

| Phase | Placeholder until... |
|---|---|
| `quick-play` | Card system is implemented; opponents will spend cards here to respond to action declarations |
| `post-combat` gold | Gold resource system is implemented; death checks remain but gold award logic is added alongside unit removal |

---

## Unit Ownership Model

`World.unitOwnership: ComponentStore<string>` maps each `EntityId` to a player id string matching the `TurnSystem` participant ids (e.g. `"player1"`, `"player2"`).

- **Selection guard**: `SelectionSystem._handleIdleClick()` checks `world.unitOwnership.get(occupant) === state.activePlayerId`. Units owned by a different player, or units with no owner (`undefined`), cannot be selected.
- **`activePlayerId`** on `GameState` is set in `idle.onEnter` from `turnSystem.activeId` each time a new turn begins (triggered via `action-phase.onEnter` on `TurnFlow`).
- Neutral units (no entry in `unitOwnership`) are intentionally unselectable by any player.

---

## EventBus and TurnSystem Wiring

`EventBus` is instantiated as a `public eventBus` field on `GridMovementScene` and passed to `TurnSystem` via constructor. This keeps the bus scoped to the scene — no global singleton.

`GridMovementCanvas` (React) accesses `scene.eventBus` to subscribe to `turn:begin` for updating the active player UI label.

`TurnSystem` is constructed with `loop=true` in the scene so turns cycle indefinitely round after round.

---

## `onEnter` Hooks Summary

All cleanup lives in the arriving phase's `onEnter`. `onExit` hooks are empty.

**`GameState` (inner):**

| Phase | `onEnter` |
|---|---|
| `idle` | `selectedEntity = null`, clear `reachableTiles` + `reachableAttackableTiles` + `attackableEntities`, `activePlayerId = turnSystem.activeId` |
| `selected` | — |
| `awaiting-move` | `attackableEntities.clear()` |
| `moved` | — |

**`TurnFlow` (outer):**

| Phase | `onEnter` |
|---|---|
| `action-phase` | `state.transition("idle")` |
| `declare-end-turn` | `queueMicrotask(() => turnFlow.transition("quick-play"))` |
| `quick-play` | `queueMicrotask(() => turnFlow.transition("combat"))` |
| `combat` | Resolve each `pendingAttacks` entry via `combatSystem.resolveAttack()`, update HP or queue to `pendingDeaths`, clear `pendingAttacks`; `queueMicrotask(() => turnFlow.transition("post-combat"))` |
| `post-combat` | `world.removeUnit()` per `pendingDeaths`, clear `pendingDeaths`, call `turnSystem.endTurn()` |

`queueMicrotask` is used in auto-advancing placeholder phases to prevent synchronous recursive `onEnter` call stacks.
