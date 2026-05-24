# Gameplay Loop FSM

Documents the full turn-resolution state machine wired into `GameState` alongside the existing per-unit interaction phases.

---

## TurnPhase Union

```ts
export type TurnPhase =
  | "idle"              // waiting for active player input
  | "selected"          // unit selected; showing movement range + attack targets
  | "awaiting-move"     // unit attacked; showing movement range before deselect
  | "declare-end-turn"  // player clicked End Turn; kicks off turn-resolution pipeline
  | "quick-play"        // placeholder: opponent response window (card system not yet implemented)
  | "combat"            // placeholder: resolve queued attack declarations into damage
  | "post-combat";      // placeholder: remove dead units, award gold, advance turn
```

The first three phases (`idle`, `selected`, `awaiting-move`) are per-unit interaction phases driven by player clicks via `SelectionSystem`. The last four are turn-resolution phases that run automatically in sequence after End Turn is declared.

---

## Phase Transition Diagram

```
GridMovementScene.init()
  └─ state.start("idle")
  └─ turnSystem.start("player1") → emits "turn:begin"
       └─ listener: state.transition("idle")
            └─ idle.onEnter: activePlayerId = "player1"

── ACTION PHASE (player1) ──────────────────────────────────────

Player clicks a friendly unit
  └─ state.transition("selected")
       └─ SelectionSystem computes reachableTiles + attackableEntities

Player clicks an attackable enemy
  └─ _declareAttack(attacker, target) → pushed to state.pendingAttacks
  └─ state.transition("awaiting-move")

Player clicks End Turn button
  └─ scene.endTurn() → state.transition("declare-end-turn")

── TURN-RESOLUTION PIPELINE ────────────────────────────────────

declare-end-turn.onEnter
  └─ queueMicrotask → state.transition("quick-play")

quick-play.onEnter           [placeholder: card response window]
  └─ queueMicrotask → state.transition("combat")

combat.onEnter               [placeholder: full combat system pending PR]
  └─ resolve state.pendingAttacks → damage math → populate state.pendingDeaths
  └─ state.pendingAttacks = []
  └─ queueMicrotask → state.transition("post-combat")

post-combat.onEnter          [placeholder: gold resource system not yet implemented]
  └─ world.removeUnit() for each state.pendingDeaths
  └─ state.pendingDeaths = []
  └─ turnSystem.endTurn()
       └─ EventBus emits "turn:begin" (player2)
            └─ listener: state.transition("idle")
                 └─ idle.onEnter: activePlayerId = "player2"

── ACTION PHASE (player2) ──────────────────────────────────────
```

---

## `pendingAttacks` Lifecycle

| Step | Location | What happens |
|---|---|---|
| Declaration | `SelectionSystem._declareAttack()` | `{ attackerId, targetId }` pushed to `state.pendingAttacks` |
| Held | `state.pendingAttacks` | Survives through `declare-end-turn` and `quick-play` untouched |
| Resolution | `combat` phase `onEnter` | Damage computed (`max(0, atk.attack - def.defense)`), stats updated, dead units queued to `state.pendingDeaths`, array cleared |
| Death removal | `post-combat` phase `onEnter` | `world.removeUnit()` for each entry in `state.pendingDeaths`, then array cleared |

The two-step split (combat computes, post-combat removes) keeps a clean extension point for future death animations or gold distribution between the two phases.

---

## Placeholder Phases

| Phase | Placeholder until... |
|---|---|
| `quick-play` | Card system is implemented; opponents will spend cards here to respond to action declarations |
| `combat` | Combat system PR is merged (currently under review on a separate branch); full damage distribution replaces the inline math in `onEnter` |
| `post-combat` | Gold resource system is implemented; death checks remain here but gold award logic is added alongside unit removal |

---

## Unit Ownership Model

`World.unitOwnership: ComponentStore<string>` maps each `EntityId` to a player id string that matches the `TurnSystem` participant ids (e.g. `"player1"`, `"player2"`).

- **Selection guard**: `SelectionSystem._handleIdleClick()` checks `world.unitOwnership.get(occupant) === state.activePlayerId`. Units owned by a different player, or units with no owner (`undefined`), cannot be selected.
- **`activePlayerId`** on `GameState` is set in `idle.onEnter` from `turnSystem.activeId` each time a new turn begins.
- Neutral units (no entry in `unitOwnership`) are intentionally unselectable by any player.

---

## onEnter / onExit Hooks Summary

All cleanup is placed in the arriving phase's `onEnter`. `onExit` hooks are empty — cleanup on exit would risk double-cleanup if a transition is redirected.

| Phase | `onEnter` |
|---|---|
| `idle` | `selectedEntity = null`, clear `reachableTiles` + `attackableEntities`, `activePlayerId = turnSystem.activeId` |
| `selected` | — |
| `awaiting-move` | `attackableEntities.clear()` |
| `declare-end-turn` | `queueMicrotask(() => transition("quick-play"))` |
| `quick-play` | `queueMicrotask(() => transition("combat"))` |
| `combat` | Resolve `pendingAttacks`, populate `pendingDeaths`, clear `pendingAttacks`; `queueMicrotask(() => transition("post-combat"))` |
| `post-combat` | Remove dead units, clear `pendingDeaths`, call `turnSystem.endTurn()` |

`queueMicrotask` is used in auto-advancing placeholder phases to prevent synchronous recursive `onEnter` call stacks.
