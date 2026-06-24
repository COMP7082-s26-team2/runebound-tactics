# Combat Reaction Window FSM

Documents the `ReactionWindowMachine` that expands the `quick-play` placeholder in the `TurnMachine` into a four-sub-phase card-play window before damage resolves.

---

## Architecture Overview

| Machine | Lives in | States | Responsibility |
|---|---|---|---|
| `ReactionWindowMachine` | `shared/src/fsm/reaction/` | `defender`, `defender-ally`, `attacker-ally`, `resolve`, `closed` | Sequences card-play opportunities for each participant before damage resolves. `GameRoom` creates one instance per combat trigger while `TurnMachine` is in `quick-play`; fires `QUICK_PLAY_RESOLVED` when machine reaches `closed`. |

`TurnMachine` is unchanged. The `quick-play` subscriber in `GameRoom` creates the `ReactionWindowMachine` and defers `QUICK_PLAY_RESOLVED` until the reaction machine reaches `closed`. Damage resolution in the `combat` subscriber is unchanged.

---

## Phase Unions

**`ReactionWindowState`** (machine state names):
```ts
export type ReactionWindowState =
    | "defender"        // defending player may play reaction cards or pass
    | "defender-ally"   // placeholder: defending player's ally window (multi-player pending)
    | "attacker-ally"   // placeholder: attacking player's ally window (multi-player pending)
    | "resolve"         // all cards locked in; window about to close
    | "closed";         // machine terminal state; GameRoom fires QUICK_PLAY_RESOLVED
```

**`ReactionWindowEvent`** (events the machine accepts):
```ts
export type ReactionWindowEvent =
    | "PLAY_CARD"          // active player played a valid reaction card (self-loop)
    | "REACTION_PASS"      // active player explicitly passed their window
    | "REACTION_TIMEOUT";  // per-phase timer expired
```

**`ReactionWindowContext`**:
```ts
export interface ReactionWindowContext {
    attackerOwnerId: string;  // sessionId of the attacker's owner
    defenderOwnerId: string;  // sessionId of the defender's owner
    cardsPlayed: Array<{ playerId: string; cardId: string }>;
}
```

---

## Phase Transition Diagram

```
GameRoom._onTurnPhase("quick-play")
  _reactionMachine = createReactionWindowMachine(attackerOwnerId, defenderOwnerId)
  _reactionMachine.subscribe(subscriber)     // fires immediately: "defender"
    → subscriber: state.reactionPhase = "defender"
                  broadcast("reaction_phase", { phase: "defender", activePlayer: defenderOwnerId })
                  _startReactionTimer(REACTION_TIMEOUT_MS)

── DEFENDER WINDOW ──────────────────────────────────────────────────────────

onMessage("pass_reaction")
  └─ guard: _reactionMachine.state === "defender"
            client.sessionId === defenderOwnerId
  └─ _clearReactionTimer()
  └─ _reactionMachine.send("REACTION_PASS")
       → defender → defender-ally
            subscriber: state.reactionPhase = "defender-ally"
                        broadcast("reaction_phase", { phase: "defender-ally", activePlayer: defenderOwnerId })
                        _startReactionTimer(REACTION_TIMEOUT_MS)   [placeholder: no ally input yet]
                        _reactionMachine.send("REACTION_PASS")     [placeholder: auto-pass ally window]

onMessage("play_reaction_card")   [card system pending — rejected in placeholder]
  └─ guard: card.is_reaction === true   (else reject, no transition)
  └─ _reactionMachine.send("PLAY_CARD")   (self-loop; records card in ctx.cardsPlayed)

Timer fires (REACTION_TIMEOUT_MS elapsed)
  └─ _clearReactionTimer()
  └─ _reactionMachine.send("REACTION_TIMEOUT")
       same transitions as REACTION_PASS for whichever state is active

── DEFENDER-ALLY WINDOW (placeholder — auto-passed) ─────────────────────────
── ATTACKER-ALLY WINDOW (placeholder — auto-passed) ─────────────────────────

── RESOLVE ───────────────────────────────────────────────────────────────────

resolve (via subscriber)
  → state.reactionPhase = "resolve"
    broadcast("reaction_phase", { phase: "resolve", activePlayer: "" })
    _reactionMachine.send("REACTION_PASS")   [auto-advance; no player input in resolve]

── CLOSED ────────────────────────────────────────────────────────────────────

closed (via subscriber)
  → state.reactionPhase = ""    [clear: window over]
    broadcast("reaction_phase", { phase: "closed", activePlayer: "" })
    _reactionMachine = null
    _turnMachine.send("QUICK_PLAY_RESOLVED")
         → TurnMachine: quick-play → combat
              subscriber: state.turnPhase = "combat"
                          _resolvePendingAttack()
                          if state.phase !== "ended": send("COMBAT_RESOLVED")
```

---

## Per-Phase Entry Summary

All side effects occur in the `GameRoom` subscriber callback when the machine notifies `(state, context)`. State class `onEntry`/`onExit` hooks are unused (pure per the shared FSM rule).

| Phase | What the subscriber does |
|---|---|
| `"defender"` | `state.reactionPhase = "defender"`. Broadcast `reaction_phase`. Start timer. |
| `"defender-ally"` | `state.reactionPhase = "defender-ally"`. Broadcast. Clear + restart timer. Auto-pass (placeholder: no ally input). |
| `"attacker-ally"` | `state.reactionPhase = "attacker-ally"`. Broadcast. Clear + restart timer. Auto-pass (placeholder). |
| `"resolve"` | `state.reactionPhase = "resolve"`. Broadcast. Clear timer. Auto-advance via `REACTION_PASS`. |
| `"closed"` | `state.reactionPhase = ""`. Broadcast. Null machine. Fire `QUICK_PLAY_RESOLVED` into `TurnMachine`. |

---

## Timer Model

Each phase starts a `setTimeout` of `REACTION_TIMEOUT_MS` (exported constant, default `10_000` ms). The timer handle is stored in `_reactionTimer: ReturnType<typeof setTimeout> | null`. `_clearReactionTimer()` calls `clearTimeout` and nulls the handle. On expiry the timer fires `_reactionMachine.send("REACTION_TIMEOUT")`, which follows the same transitions as `REACTION_PASS` for whichever state is active.

The machine is null-checked before every `send()` call in the timer callback to guard against double-fire or post-teardown execution, because unlike `TurnMachine`'s synchronous call stack, `ReactionWindowMachine` advances asynchronously and the timer fires outside the Colyseus message handler.

---

## Reaction Card Guard

`play_reaction_card` messages are only accepted while `_reactionMachine` is non-null and the sender matches the active player for the current sub-phase. Cards without `is_reaction: true` are rejected silently (no state transition). The card system is pending; in the placeholder implementation this handler logs a rejection for all cards and takes no further action.

---

## `ReactionWindowContext` Lifecycle

`cardsPlayed` accumulates `{ playerId, cardId }` entries over the full window via self-loop actions in the state classes. It is passed to `_resolvePendingAttack()` after `QUICK_PLAY_RESOLVED` for future card-effect application. Empty in the placeholder implementation.

---

## `reactionPhase` Schema Field

`GameState.reactionPhase` (a Colyseus-synchronized `string`) mirrors the machine state at all times during the window. Written exclusively in the `_onReactionPhase` subscriber. Reset to `""` when `closed` is reached. Clients observe this field to render reaction UI (e.g. "Defender's turn to react").

---

## Placeholder Phases

| Phase | Placeholder until... |
|---|---|
| `"defender-ally"` | Multi-player ally system: a second player controls ally units and can spend reaction cards |
| `"attacker-ally"` | Same — attacker's allies respond before damage resolves |
| `play_reaction_card` acceptance | Card/ability system: unit cards with `is_reaction: true` are validated, deducted from hand, and recorded |
