# Gameplay Loop FSM

Documents the two-FSM architecture that drives the full gameplay loop.

---

## Architecture Overview

The gameplay loop is split across two separate state machines:

| Machine | Type | Phases | Responsibility |
|---|---|---|---|
| `GameState` | Inner | `idle`, `selected`, `awaiting-move` | Per-unit interaction; driven by player clicks via `SelectionSystem` |
| `TurnFlow` | Outer | `action-phase`, `declare-end-turn`, `quick-play`, `combat`, `post-combat` | Turn pipeline; auto-advances through resolution after End Turn is declared |

`SelectionSystem` is only active while `TurnFlow` is in `action-phase`. The outer machine auto-advances through the three resolution placeholder phases and calls `TurnSystem.endTurn()`, which emits `turn:begin` on the shared `EventBus` to start the next player's turn.

---

## Phase Unions

**`TurnPhase`** (inner — `GameState`):
```ts
export type TurnPhase =
  | "idle"           // waiting for active player input
  | "selected"       // unit selected; showing movement range + attack targets
  | "awaiting-move"; // unit attacked; showing movement range before deselect
```

**`TurnFlowPhase`** (outer — `TurnFlow`):
```ts
export type TurnFlowPhase =
  | "action-phase"      // inner GameState machine active; player selects/moves/attacks
  | "declare-end-turn"  // player clicked End Turn; kicks off resolution pipeline
  | "quick-play"        // placeholder: opponent response window (card system pending)
  | "combat"            // placeholder: resolve pendingAttacks (combat PR pending)
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
  └─ SelectionSystem._handleIdleClick() — ownership check passes
  └─ state.transition("selected")
       └─ SelectionSystem computes reachableTiles + attackableEntities

Player clicks attackable enemy
  └─ SelectionSystem._declareAttack(attacker, target)
       └─ state.pendingAttacks.push({ attackerId, targetId })
  └─ state.transition("awaiting-move")

Player clicks End Turn button
  └─ scene.endTurn() → turnFlow.transition("declare-end-turn")

── TURN RESOLUTION PIPELINE ────────────────────────────────────

declare-end-turn.onEnter
  └─ queueMicrotask → turnFlow.transition("quick-play")

quick-play.onEnter           [placeholder: card response window]
  └─ queueMicrotask → turnFlow.transition("combat")

combat.onEnter               [placeholder: full combat system pending PR]
  └─ resolve state.pendingAttacks → damage math → populate state.pendingDeaths
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

## `pendingAttacks` Lifecycle

| Step | Location | What happens |
|---|---|---|
| Declaration | `SelectionSystem._declareAttack()` | `{ attackerId, targetId }` pushed to `state.pendingAttacks` |
| Held | `state.pendingAttacks` | Survives through `declare-end-turn` and `quick-play` untouched |
| Resolution | `combat` phase `onEnter` (on `TurnFlow`) | Damage computed (`max(0, atk.attack - def.defense)`), stats updated, dead units queued to `state.pendingDeaths`, array cleared |
| Death removal | `post-combat` phase `onEnter` (on `TurnFlow`) | `world.removeUnit()` for each entry in `state.pendingDeaths`, then array cleared |

The two-step split (combat computes, post-combat removes) keeps a clean extension point for future death animations or gold distribution to be inserted between the two phases.

---

## Placeholder Phases

| Phase | Placeholder until... |
|---|---|
| `quick-play` | Card system is implemented; opponents will spend cards here to respond to action declarations |
| `combat` | Combat system PR is merged (currently under review on a separate branch); full damage distribution replaces the inline math in `onEnter` |
| `post-combat` | Gold resource system is implemented; death checks remain here but gold award logic is added alongside unit removal |

---

## Unit Ownership Model

`World.unitOwnership: ComponentStore<string>` maps each `EntityId` to a player id string matching the `TurnSystem` participant ids (e.g. `"player1"`, `"player2"`).

- **Selection guard**: `SelectionSystem._handleIdleClick()` checks `world.unitOwnership.get(occupant) === state.activePlayerId`. Units owned by a different player, or units with no owner (`undefined`), cannot be selected.
- **`activePlayerId`** on `GameState` is set in `idle.onEnter` from `turnSystem.activeId` each time a new turn begins (via `action-phase.onEnter` on `TurnFlow`).
- Neutral units (no entry in `unitOwnership`) are intentionally unselectable by any player.

---

## EventBus and TurnSystem Wiring

`EventBus` is instantiated as a `public eventBus` field on `GridMovementScene` and passed to `TurnSystem` via constructor. This keeps the bus scoped to the scene — no global singleton.

`GridMovementCanvas` (React) accesses `scene.eventBus` to subscribe to `turn:begin` for updating the active player UI label.

`TurnSystem` is constructed with `loop=true` in the scene so turns cycle indefinitely round after round.

---

## `onEnter` Hooks Summary

All cleanup lives in the arriving phase's `onEnter`. `onExit` hooks are empty to avoid double-cleanup if a transition is ever redirected.

**`GameState` (inner):**

| Phase | `onEnter` |
|---|---|
| `idle` | `selectedEntity = null`, clear `reachableTiles` + `attackableEntities`, `activePlayerId = turnSystem.activeId` |
| `selected` | — |
| `awaiting-move` | `attackableEntities.clear()` |

**`TurnFlow` (outer):**

| Phase | `onEnter` |
|---|---|
| `action-phase` | `state.transition("idle")` |
| `declare-end-turn` | `queueMicrotask(() => turnFlow.transition("quick-play"))` |
| `quick-play` | `queueMicrotask(() => turnFlow.transition("combat"))` |
| `combat` | Resolve `pendingAttacks`, populate `pendingDeaths`, clear `pendingAttacks`; `queueMicrotask(() => turnFlow.transition("post-combat"))` |
| `post-combat` | Remove dead units, clear `pendingDeaths`, call `turnSystem.endTurn()` |

`queueMicrotask` is used in auto-advancing placeholder phases to prevent synchronous recursive `onEnter` call stacks.