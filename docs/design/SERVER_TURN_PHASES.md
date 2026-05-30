# Server Turn Phases

Documents the five-state server-side TurnMachine that drives per-turn resolution inside GameRoom.

---

## Architecture Overview

| Machine | Lives in | States | Responsibility |
|---|---|---|---|
| `TurnMachine` | `shared/src/fsm/turn/` | `action-phase`, `declare-end-turn`, `quick-play`, `combat`, `post-combat` | Tracks which resolution phase the server is currently executing within a single player's turn. `GameRoom` subscribes and performs all Colyseus mutations in the subscriber callback. |

`TurnMachine` is instantiated once per `GameRoom` in `_startGame()`. It is the single source of truth for within-turn phase state. `GameState.turnPhase` (a Colyseus-synchronized string field) mirrors the machine state at all times and is written exclusively in the subscriber.

The machine context holds only `currentPlayerId: string`. All other game data (unit HP, positions, reachability cache) lives outside the machine and is owned by `GameRoom`.

---

## Phase Unions

**`TurnState`** (machine state names):
```ts
export type TurnState =
  | "action-phase"      // active player issuing moves/attacks; machine waits for input
  | "declare-end-turn"  // player declared end of turn; turn-advance pending
  | "quick-play"        // placeholder: opponent response window (card system pending)
  | "combat"            // resolve _pendingAttack: damage applied, unit possibly removed
  | "post-combat";      // placeholder: death cleanup + gold award (gold system pending)
```

**`TurnEvent`** (events the machine accepts):
```ts
export type TurnEvent =
  | "END_TURN"             // active player clicked End Turn → declare-end-turn
  | "ALL_UNITS_MOVED"      // all active player's units exhausted → declare-end-turn
  | "ATTACK_DECLARED"      // attack_unit validated; _pendingAttack set → quick-play
  | "QUICK_PLAY_RESOLVED"  // quick-play window closed → combat
  | "COMBAT_RESOLVED"      // combat damage applied → post-combat
  | "POST_COMBAT_RESOLVED" // post-combat cleanup complete → action-phase
  | "TURN_ADVANCED";       // turn-advance committed; ctx.currentPlayerId updated → action-phase
```

---

## Phase Transition Diagram

```
GameRoom._startGame()
  _turnMachine = createTurnMachine(firstPlayerId)
  _turnMachine.subscribe(subscriber)       // fires immediately: "action-phase"
    → subscriber: state.turnPhase = "action-phase"  (harmless init)

── ACTION PHASE (current player) ───────────────────────────────

onMessage("move_unit")
  └─ _isCurrentTurn() guard
  └─ validate + apply move + _updateReachabilityAfterMove()

onMessage("attack_unit")
  └─ _isCurrentTurn() guard (machine.state === "action-phase" required)
  └─ validate + apply move-half (if moveTo present)
  └─ compute damage, set _pendingAttack = { attackerId, targetId, damage, defenderDied, newHp }
  └─ exhaust attacker (hasMoved = hasActed = true)
  └─ update reachability cache (attacker removed)
  └─ _turnMachine.send("ATTACK_DECLARED")
       → action-phase → quick-play
            subscriber: state.turnPhase = "quick-play"
                        log "[GameRoom] quick-play: no opponent responses"
                        send("QUICK_PLAY_RESOLVED")
                             → quick-play → combat
                                  subscriber: state.turnPhase = "combat"
                                              _resolvePendingAttack()
                                              if state.phase !== "ended": send("COMBAT_RESOLVED")
                                                   → combat → post-combat
                                                        subscriber: state.turnPhase = "post-combat"
                                                                    log "[GameRoom] post-combat: gold distribution pending"
                                                                    send("POST_COMBAT_RESOLVED")
                                                                         → post-combat → action-phase
                                                                              subscriber: state.turnPhase = "action-phase"

onMessage("end_turn")
  └─ _isCurrentTurn() guard
  └─ _turnMachine.send("END_TURN")
       → action-phase → declare-end-turn
            subscriber: state.turnPhase = "declare-end-turn"
                        _performTurnAdvance()
                        send("TURN_ADVANCED", { playerId: state.currentTurnId })
                             → declare-end-turn → action-phase (ctx.currentPlayerId updated)
                                  subscriber: state.turnPhase = "action-phase"

── ACTION PHASE (next player) ──────────────────────────────────
```

---

## Per-Phase Entry Summary

All side effects occur in the `GameRoom` subscriber callback when the machine notifies `(state, context)`. State class `onEntry`/`onExit` hooks are unused (pure per the shared FSM rule).

| Phase | What the subscriber does |
|---|---|
| `"action-phase"` | `state.turnPhase = "action-phase"`. No other action. Landing point after attack resolution and after turn advance. |
| `"declare-end-turn"` | `state.turnPhase = "declare-end-turn"`. Calls `_performTurnAdvance()` (resets flags, rotates `currentTurnId`, increments `turnNumber`, rebuilds reachability cache). Then calls `send("TURN_ADVANCED", { playerId: state.currentTurnId })`. |
| `"quick-play"` | `state.turnPhase = "quick-play"`. Logs `"[GameRoom] quick-play: no opponent responses"`. Immediately calls `send("QUICK_PLAY_RESOLVED")`. |
| `"combat"` | `state.turnPhase = "combat"`. Calls `_resolvePendingAttack()` (applies HP damage or deletes unit, calls `_checkWinCondition()`). If `state.phase !== "ended"`, calls `send("COMBAT_RESOLVED")`. Machine stays in `"combat"` permanently if game ended — correct, no further messages are processed. |
| `"post-combat"` | `state.turnPhase = "post-combat"`. Logs `"[GameRoom] post-combat: gold distribution pending"`. Immediately calls `send("POST_COMBAT_RESOLVED")`. |

---

## `_pendingAttack` Struct

Server-side only — not in `GameState` schema. Set in the `attack_unit` handler before `ATTACK_DECLARED` fires. Cleared in `_resolvePendingAttack()`. Null outside of the quick-play → combat window.

```ts
interface PendingAttack {
    attackerId:   string;
    targetId:     string;
    damage:       number;
    defenderDied: boolean;
    newHp:        number;
}
```

---

## Synchronous Call Stack Safety

When the subscriber fires for `"quick-play"` and immediately calls `send("QUICK_PLAY_RESOLVED")`, this synchronously re-enters `Machine.send()` before the current call stack has returned. The full attack stack depth:

```
send("ATTACK_DECLARED")
  → notify "quick-play"
    → send("QUICK_PLAY_RESOLVED")
      → notify "combat"
        → send("COMBAT_RESOLVED")
          → notify "post-combat"
            → send("POST_COMBAT_RESOLVED")
              → notify "action-phase"   ← deepest frame (4 send() calls deep)
```

This is safe because:
1. Node.js is single-threaded — no new Colyseus messages can arrive mid-execution.
2. `Machine._notify()` iterates a `Set` — adding/removing listeners mid-notify has no effect on the current iteration.
3. Each re-entrant `send()` finds a different current state and therefore a different handler; no infinite recursion is possible.
4. Maximum stack depth is 4 `send()` calls (attack path); the `end_turn` path is 2.

`queueMicrotask` (used in the client-side `TurnFlow`) is not needed here because the server has no render loop. Synchronous resolution means Colyseus broadcasts a single coherent state patch per message rather than four intermediate ones.

---

## `_isCurrentTurn()` Guard

```ts
private _isCurrentTurn(client: Client): boolean {
    return (
        this.state.phase === "active" &&
        this.state.currentTurnId === client.sessionId &&
        this._turnMachine.state === "action-phase"
    );
}
```

The third condition prevents a player from issuing a second `attack_unit` while the machine is mid-resolution.

---

## Elimination Edge Case

`_eliminatePlayer()` only fires `END_TURN` if the machine is in `"action-phase"`. If mid-resolution (`"quick-play"`, `"combat"`, or `"post-combat"`), the pipeline completes naturally and returns to `"action-phase"`. If in `"declare-end-turn"`, `TURN_ADVANCED` is already pending.

Calling `_performTurnAdvance()` directly during mid-resolution would corrupt `currentTurnId` while `_pendingAttack` is pending.

---

## Placeholder Phases

| Phase | Placeholder until... |
|---|---|
| `"quick-play"` | Card/ability system: opposing player spends interrupt cards before combat resolves |
| `"post-combat"` | Gold resource system: kill bounties and city income awarded before returning to `"action-phase"` |
