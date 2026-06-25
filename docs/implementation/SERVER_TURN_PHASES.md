# Implementation Plan: Server Turn Phases

Implements the five-state server-side `TurnMachine` described in [`docs/design/SERVER_TURN_PHASES.md`](../design/SERVER_TURN_PHASES.md).

---

## Files

| File | Status | Change |
|---|---|---|
| `shared/src/fsm/turn/events.ts` | Modify | Rename `TurnState` values; add 3 new states; add 4 new events |
| `shared/src/fsm/turn/states/ActiveState.ts` | Delete | Replaced by `ActionPhaseState.ts` |
| `shared/src/fsm/turn/states/ResolvingState.ts` | Delete | Replaced by `DeclareEndTurnState.ts` |
| `shared/src/fsm/turn/states/ActionPhaseState.ts` | **New** | Handles `END_TURN`, `ALL_UNITS_MOVED` → `"declare-end-turn"`; `ATTACK_DECLARED` → `"quick-play"` |
| `shared/src/fsm/turn/states/DeclareEndTurnState.ts` | **New** | Handles `TURN_ADVANCED` → `"action-phase"` |
| `shared/src/fsm/turn/states/QuickPlayState.ts` | **New** | Handles `QUICK_PLAY_RESOLVED` → `"combat"` |
| `shared/src/fsm/turn/states/CombatState.ts` | **New** | Handles `COMBAT_RESOLVED` → `"post-combat"` |
| `shared/src/fsm/turn/states/PostCombatState.ts` | **New** | Handles `POST_COMBAT_RESOLVED` → `"action-phase"` |
| `shared/src/fsm/turn/TurnMachine.ts` | Modify | Register all 5 states; initial = `"action-phase"` |
| `shared/src/fsm/index.ts` | Modify | Export new state classes; remove old |
| `shared/src/schemas/GameState.ts` | Modify | Add `turnPhase: string = "action-phase"` |
| `server/src/rooms/GameRoom.ts` | Modify | Instantiate TurnMachine; add subscriber; refactor `_handleAttack`; rename `_advanceTurn` → `_performTurnAdvance`; update `_isCurrentTurn` and `_eliminatePlayer` |
| `shared/tests/ActiveState.test.ts` | Delete | Replaced by `ActionPhaseState.test.ts` |
| `shared/tests/ResolvingState.test.ts` | Delete | Replaced by `DeclareEndTurnState.test.ts` |
| `shared/tests/ActionPhaseState.test.ts` | **New** | Unit tests for `ActionPhaseState` |
| `shared/tests/DeclareEndTurnState.test.ts` | **New** | Unit tests for `DeclareEndTurnState` |
| `shared/tests/turnMachine.test.ts` | Modify | Update all state/event name references; add attack pipeline tests |

---

## 1. `shared/src/fsm/turn/events.ts` — Rename states, add events

Replace the entire file:

```ts
/**
 * Turn FSM — event union, context shape, payload types.
 *
 * action-phase     — active player's turn; waiting for move/attack/end-turn input.
 * declare-end-turn — player declared end of turn; turn-advance in progress.
 * quick-play       — placeholder: opponent response window (card system pending).
 * combat           — resolving a pending attack (damage applied, unit possibly removed).
 * post-combat      — placeholder: death cleanup + gold award (gold system pending).
 */

export type TurnState =
    | "action-phase"
    | "declare-end-turn"
    | "quick-play"
    | "combat"
    | "post-combat";

export type TurnEvent =
    | "END_TURN"
    | "ALL_UNITS_MOVED"
    | "ATTACK_DECLARED"
    | "QUICK_PLAY_RESOLVED"
    | "COMBAT_RESOLVED"
    | "POST_COMBAT_RESOLVED"
    | "TURN_ADVANCED";

export interface TurnContext {
    currentPlayerId: string;
}

export interface TurnAdvancedPayload {
    playerId: string;
}
```

---

## 2. `shared/src/fsm/turn/states/ActionPhaseState.ts` — New (replaces `ActiveState.ts`)

Delete `ActiveState.ts`. Create `ActionPhaseState.ts`:

```ts
import { StateBase, type TransitionResult } from "../../StateBase";
import type { TurnContext, TurnEvent } from "../events";

export class ActionPhaseState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "action-phase";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        _payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "END_TURN" || event === "ALL_UNITS_MOVED") {
            return "declare-end-turn";
        }
        if (event === "ATTACK_DECLARED") {
            return "quick-play";
        }
        return null;
    }
}
```

---

## 3. `shared/src/fsm/turn/states/DeclareEndTurnState.ts` — New (replaces `ResolvingState.ts`)

Delete `ResolvingState.ts`. Create `DeclareEndTurnState.ts`:

```ts
import { StateBase, type TransitionResult } from "../../StateBase";
import type { TurnContext, TurnEvent, TurnAdvancedPayload } from "../events";

/**
 * Turn-end transition holding state.
 * Host subscribes, performs schema-side work (reset flags, write currentTurnId,
 * rebuild reachability cache), then fires TURN_ADVANCED with the new player's ID.
 *
 * IMPORTANT: do NOT call into Colyseus, the World, or any host-only API
 * from this class. State classes must be pure (modulo Ctx mutation).
 */
export class DeclareEndTurnState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "declare-end-turn";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "TURN_ADVANCED") {
            const p = payload as TurnAdvancedPayload;
            return {
                target: "action-phase",
                action: () => ({ currentPlayerId: p.playerId }),
            };
        }
        return null;
    }
}
```

---

## 4. `shared/src/fsm/turn/states/QuickPlayState.ts` — New

```ts
import { StateBase, type TransitionResult } from "../../StateBase";
import type { TurnContext, TurnEvent } from "../events";

/** Placeholder: opponent response window (card/ability system pending). */
export class QuickPlayState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "quick-play";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        _payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "QUICK_PLAY_RESOLVED") {
            return "combat";
        }
        return null;
    }
}
```

---

## 5. `shared/src/fsm/turn/states/CombatState.ts` — New

```ts
import { StateBase, type TransitionResult } from "../../StateBase";
import type { TurnContext, TurnEvent } from "../events";

/**
 * Resolving a pending attack. Host subscriber calls _resolvePendingAttack(),
 * checks win condition, and fires COMBAT_RESOLVED only if game has not ended.
 * If game ends here, machine stays in "combat" permanently — correct, since
 * no further messages are processed.
 */
export class CombatState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "combat";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        _payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "COMBAT_RESOLVED") {
            return "post-combat";
        }
        return null;
    }
}
```

---

## 6. `shared/src/fsm/turn/states/PostCombatState.ts` — New

```ts
import { StateBase, type TransitionResult } from "../../StateBase";
import type { TurnContext, TurnEvent } from "../events";

/** Placeholder: death-animation hooks and gold-on-kill award (systems pending). */
export class PostCombatState extends StateBase<TurnContext, TurnEvent> {
    readonly name = "post-combat";

    handle(
        event: TurnEvent,
        _ctx: TurnContext,
        _payload?: unknown,
    ): TransitionResult<TurnContext> {
        if (event === "POST_COMBAT_RESOLVED") {
            return "action-phase";
        }
        return null;
    }
}
```

---

## 7. `shared/src/fsm/turn/TurnMachine.ts` — Register all 5 states

```diff
 import { Machine } from "../Machine";
-import { ActiveState } from "./states/ActiveState";
-import { ResolvingState } from "./states/ResolvingState";
+import { ActionPhaseState } from "./states/ActionPhaseState";
+import { DeclareEndTurnState } from "./states/DeclareEndTurnState";
+import { QuickPlayState } from "./states/QuickPlayState";
+import { CombatState } from "./states/CombatState";
+import { PostCombatState } from "./states/PostCombatState";
 import type { TurnContext, TurnEvent } from "./events";

 export type TurnMachine = Machine<TurnContext, TurnEvent>;

 export function createTurnMachine(initialPlayerId: string): TurnMachine {
     return new Machine<TurnContext, TurnEvent>({
-        initial: "active",
+        initial: "action-phase",
         context: { currentPlayerId: initialPlayerId },
-        states: [new ActiveState(), new ResolvingState()],
+        states: [
+            new ActionPhaseState(),
+            new DeclareEndTurnState(),
+            new QuickPlayState(),
+            new CombatState(),
+            new PostCombatState(),
+        ],
     });
 }
```

---

## 8. `shared/src/fsm/index.ts` — Update exports

```diff
 // Turn machine
 export { createTurnMachine } from "./turn/TurnMachine";
 export type { TurnMachine } from "./turn/TurnMachine";
 export type {
     TurnState,
     TurnEvent,
     TurnContext,
     TurnAdvancedPayload,
 } from "./turn/events";
+export { ActionPhaseState } from "./turn/states/ActionPhaseState";
+export { DeclareEndTurnState } from "./turn/states/DeclareEndTurnState";
+export { QuickPlayState } from "./turn/states/QuickPlayState";
+export { CombatState } from "./turn/states/CombatState";
+export { PostCombatState } from "./turn/states/PostCombatState";
```

The old `ActiveState` and `ResolvingState` exports are removed by deleting those files. Any consumer importing them by name will get a compile error — intentional.

---

## 9. `shared/src/schemas/GameState.ts` — Add `turnPhase`

```diff
     @type("string") mapId: string = "";
+
+    /**
+     * Current within-turn resolution phase, mirroring TurnMachine state.
+     * Values: "action-phase" | "declare-end-turn" | "quick-play" | "combat" | "post-combat"
+     * Written exclusively by the GameRoom TurnMachine subscriber.
+     */
+    @type("string") turnPhase: string = "action-phase";
 }
```

---

## 10. `server/src/rooms/GameRoom.ts` — Full refactor

### 10a. Add imports

```diff
 import {
     GamePlayerSlot,
     GameState,
     GameUnit,
+    createTurnMachine,
+    type TurnMachine,
     cellKey,
     computeReachableTiles,
     computeAttackDamage,
     getUnitMovement,
     squareGridNeighbors,
     unitIsExhausted,
     GRID_ROWS,
 } from "@runebound-tactics/shared";
```

### 10b. Add `PendingAttack` interface (before `GameRoom` class)

```ts
interface PendingAttack {
    attackerId:   string;
    targetId:     string;
    damage:       number;
    defenderDied: boolean;
    newHp:        number;
}
```

### 10c. Add private fields

```diff
     private _reachabilityCache = new Map<string, Set<string>>();
+    private _turnMachine!: TurnMachine;
+    private _pendingAttack: PendingAttack | null = null;
```

### 10d. Update `_isCurrentTurn()`

```diff
     private _isCurrentTurn(client: Client): boolean {
-        return this.state.phase === "active" && this.state.currentTurnId === client.sessionId;
+        return (
+            this.state.phase === "active" &&
+            this.state.currentTurnId === client.sessionId &&
+            this._turnMachine.state === "action-phase"
+        );
     }
```

### 10e. Update `_startGame()` — create machine and subscribe

```diff
         this._spawnInitialUnits();
         this._rebuildReachabilityCache(this.state.currentTurnId);
+
+        this._turnMachine = createTurnMachine(this.state.currentTurnId);
+        this._turnMachine.subscribe((phase) => this._onTurnPhase(phase));

         console.log(
```

The `subscribe()` fires immediately with `"action-phase"`, setting `state.turnPhase = "action-phase"` (harmless init).

### 10f. Add `_onTurnPhase()` subscriber method (after `_startGame()`)

```ts
    /**
     * TurnMachine subscriber. All Colyseus mutations triggered by phase
     * transitions happen here. Fires synchronously within the same call
     * stack as the send() that caused the transition.
     *
     * Re-entrancy: when "quick-play" fires and immediately calls
     * send("QUICK_PLAY_RESOLVED"), the "combat" case runs before this
     * "quick-play" case returns. Max stack depth: 4 send() calls (attack
     * path). Safe — Node.js is single-threaded.
     */
    private _onTurnPhase(phase: string): void {
        this.state.turnPhase = phase;

        switch (phase) {
            case "action-phase":
                break;

            case "declare-end-turn":
                this._performTurnAdvance();
                this._turnMachine.send("TURN_ADVANCED", {
                    playerId: this.state.currentTurnId,
                });
                break;

            case "quick-play":
                console.log("[GameRoom] quick-play: no opponent responses");
                this._turnMachine.send("QUICK_PLAY_RESOLVED");
                break;

            case "combat":
                this._resolvePendingAttack();
                if (this.state.phase !== "ended") {
                    this._turnMachine.send("COMBAT_RESOLVED");
                }
                break;

            case "post-combat":
                console.log("[GameRoom] post-combat: gold distribution pending");
                this._turnMachine.send("POST_COMBAT_RESOLVED");
                break;
        }
    }
```

### 10g. Rename `_advanceTurn()` → `_performTurnAdvance()`

Pure rename, no logic changes.

### 10h. Add `_resolvePendingAttack()` (after `_performTurnAdvance()`)

```ts
    private _resolvePendingAttack(): void {
        const pa = this._pendingAttack;
        if (!pa) return;
        this._pendingAttack = null;

        const target = this.state.units.get(pa.targetId);
        if (!target) return;

        if (pa.defenderDied) {
            console.log(
                `[GameRoom] combat: ${pa.attackerId} → ${pa.targetId} | dmg ${pa.damage} | hp ${target.hp} → 0 (died)`,
            );
            this.state.units.delete(pa.targetId);
            this._checkWinCondition();
        } else {
            console.log(
                `[GameRoom] combat: ${pa.attackerId} → ${pa.targetId} | dmg ${pa.damage} | hp ${target.hp} → ${pa.newHp}`,
            );
            target.hp = pa.newHp;
        }
    }
```

### 10i. Refactor `_handleAttack()` — defer HP mutation to combat subscriber

Replace the existing `_handleAttack()` in full. Key changes versus the original:
- Remove direct `target.hp` mutation and `state.units.delete()` — moved to `_resolvePendingAttack()`
- Set `_pendingAttack` instead
- Fire `_turnMachine.send("ATTACK_DECLARED")` at the end
- Zero-move attacks now call `_reachabilityCache.delete(attacker.unitId)` explicitly (fix: previously left stale cache entry)

```diff
-        const hpBefore = target.hp;
-        target.hp = Math.max(0, target.hp - damage);
-        const defenderDied = target.hp <= 0;
-
-        console.log(...)
-
-        attacker.hasMoved = true;
-        attacker.hasActed = true;
-
-        if (defenderDied) {
-            this.state.units.delete(target.unitId);
-            this._checkWinCondition();
-        }
-
-        if (moveTo && !moveToIsCurrentPos) {
-            this._updateReachabilityAfterMove(attacker.unitId, posBefore, { q: moveTo.q, r: moveTo.r });
-        }
+        const newHp = Math.max(0, target.hp - damage);
+        const defenderDied = newHp <= 0;
+
+        attacker.hasMoved = true;
+        attacker.hasActed = true;
+
+        if (moveTo && !moveToIsCurrentPos) {
+            this._updateReachabilityAfterMove(attacker.unitId, posBefore, {
+                q: moveTo.q,
+                r: moveTo.r,
+            });
+        } else {
+            this._reachabilityCache.delete(attacker.unitId);
+        }
+
+        this._pendingAttack = {
+            attackerId: attacker.unitId,
+            targetId: target.unitId,
+            damage,
+            defenderDied,
+            newHp,
+        };
+
+        this._turnMachine.send("ATTACK_DECLARED");
```

Also update the early validation guard at the top of `_handleAttack()`:

```diff
     private _handleAttack(sessionId: string, payload: AttackUnitPayload | undefined): void {
-        if (this.state.phase !== "active") return;
-        if (this.state.currentTurnId !== sessionId) return;
+        if (!this._turnMachine || this._turnMachine.state !== "action-phase") return;
+        if (this.state.phase !== "active") return;
+        if (this.state.currentTurnId !== sessionId) return;
```

### 10j. Update `end_turn` message handler

```diff
         this.onMessage("end_turn", (client) => {
             if (!this._isCurrentTurn(client)) return;
-            this._advanceTurn();
+            this._turnMachine.send("END_TURN");
         });
```

### 10k. Update `_eliminatePlayer()`

```diff
         if (this.state.currentTurnId === sessionId) {
-            this._advanceTurn();
+            if (this._turnMachine && this._turnMachine.state === "action-phase") {
+                this._turnMachine.send("END_TURN");
+            }
         }
```

The `this._turnMachine &&` guard protects against `_eliminatePlayer` being called before `_startGame()` (e.g., a player drops during setup phase before the machine is created).

---

## 11. Tests

### 11a. Delete and replace `shared/tests/ActiveState.test.ts` → `ActionPhaseState.test.ts`

```ts
import { ActionPhaseState } from "../src/fsm/turn/states/ActionPhaseState";
import type { TurnContext, TurnEvent } from "../src/fsm/turn/events";

const ALL_EVENTS: TurnEvent[] = [
    "END_TURN",
    "ALL_UNITS_MOVED",
    "ATTACK_DECLARED",
    "QUICK_PLAY_RESOLVED",
    "COMBAT_RESOLVED",
    "POST_COMBAT_RESOLVED",
    "TURN_ADVANCED",
];

describe("ActionPhaseState", () => {
    const ctx = (): TurnContext => ({ currentPlayerId: "p1" });

    it("transitions to declare-end-turn on END_TURN", () => {
        const state = new ActionPhaseState();
        expect(state.handle("END_TURN", ctx())).toBe("declare-end-turn");
    });

    it("transitions to declare-end-turn on ALL_UNITS_MOVED", () => {
        const state = new ActionPhaseState();
        expect(state.handle("ALL_UNITS_MOVED", ctx())).toBe("declare-end-turn");
    });

    it("transitions to quick-play on ATTACK_DECLARED", () => {
        const state = new ActionPhaseState();
        expect(state.handle("ATTACK_DECLARED", ctx())).toBe("quick-play");
    });

    it("returns null for TURN_ADVANCED", () => {
        const state = new ActionPhaseState();
        expect(state.handle("TURN_ADVANCED", ctx())).toBeNull();
    });

    it("returns null for QUICK_PLAY_RESOLVED", () => {
        const state = new ActionPhaseState();
        expect(state.handle("QUICK_PLAY_RESOLVED", ctx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new ActionPhaseState();
                expect(() =>
                    state.handle(event, ctx(), { playerId: "p2" }),
                ).not.toThrow();
            });
        }
    });
});
```

### 11b. Delete and replace `shared/tests/ResolvingState.test.ts` → `DeclareEndTurnState.test.ts`

```ts
import { DeclareEndTurnState } from "../src/fsm/turn/states/DeclareEndTurnState";
import type { TurnContext, TurnEvent } from "../src/fsm/turn/events";

const ALL_EVENTS: TurnEvent[] = [
    "END_TURN",
    "ALL_UNITS_MOVED",
    "ATTACK_DECLARED",
    "QUICK_PLAY_RESOLVED",
    "COMBAT_RESOLVED",
    "POST_COMBAT_RESOLVED",
    "TURN_ADVANCED",
];

describe("DeclareEndTurnState", () => {
    const ctx = (): TurnContext => ({ currentPlayerId: "p1" });

    it("transitions to action-phase on TURN_ADVANCED with currentPlayerId update", () => {
        const state = new DeclareEndTurnState();
        const result = state.handle("TURN_ADVANCED", ctx(), { playerId: "p2" });
        expect(result).not.toBeNull();
        if (result && typeof result === "object" && "target" in result) {
            expect(result.target).toBe("action-phase");
            const patch = result.action?.(ctx());
            expect(patch).toEqual({ currentPlayerId: "p2" });
        }
    });

    it("returns null for END_TURN", () => {
        const state = new DeclareEndTurnState();
        expect(state.handle("END_TURN", ctx())).toBeNull();
    });

    it("returns null for ALL_UNITS_MOVED", () => {
        const state = new DeclareEndTurnState();
        expect(state.handle("ALL_UNITS_MOVED", ctx())).toBeNull();
    });

    it("returns null for ATTACK_DECLARED", () => {
        const state = new DeclareEndTurnState();
        expect(state.handle("ATTACK_DECLARED", ctx())).toBeNull();
    });

    describe("exhaustiveness", () => {
        for (const event of ALL_EVENTS) {
            it(`does not throw when handling "${event}"`, () => {
                const state = new DeclareEndTurnState();
                expect(() =>
                    state.handle(event, ctx(), { playerId: "p2" }),
                ).not.toThrow();
            });
        }
    });
});
```

### 11c. Modify `shared/tests/turnMachine.test.ts` — replace fully

```ts
import { createTurnMachine } from "../src/fsm/turn/TurnMachine";

describe("turnMachine", () => {
    it("starts in action-phase with the initial player id", () => {
        const m = createTurnMachine("p1");
        expect(m.state).toBe("action-phase");
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("action-phase → declare-end-turn on END_TURN", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        expect(m.state).toBe("declare-end-turn");
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("action-phase → declare-end-turn on ALL_UNITS_MOVED", () => {
        const m = createTurnMachine("p1");
        m.send("ALL_UNITS_MOVED");
        expect(m.state).toBe("declare-end-turn");
    });

    it("action-phase → quick-play on ATTACK_DECLARED", () => {
        const m = createTurnMachine("p1");
        m.send("ATTACK_DECLARED");
        expect(m.state).toBe("quick-play");
    });

    it("quick-play → combat on QUICK_PLAY_RESOLVED", () => {
        const m = createTurnMachine("p1");
        m.send("ATTACK_DECLARED");
        m.send("QUICK_PLAY_RESOLVED");
        expect(m.state).toBe("combat");
    });

    it("combat → post-combat on COMBAT_RESOLVED", () => {
        const m = createTurnMachine("p1");
        m.send("ATTACK_DECLARED");
        m.send("QUICK_PLAY_RESOLVED");
        m.send("COMBAT_RESOLVED");
        expect(m.state).toBe("post-combat");
    });

    it("post-combat → action-phase on POST_COMBAT_RESOLVED", () => {
        const m = createTurnMachine("p1");
        m.send("ATTACK_DECLARED");
        m.send("QUICK_PLAY_RESOLVED");
        m.send("COMBAT_RESOLVED");
        m.send("POST_COMBAT_RESOLVED");
        expect(m.state).toBe("action-phase");
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("declare-end-turn → action-phase on TURN_ADVANCED with new player id", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        m.send("TURN_ADVANCED", { playerId: "p2" });
        expect(m.state).toBe("action-phase");
        expect(m.context.currentPlayerId).toBe("p2");
    });

    it("ignores TURN_ADVANCED while in action-phase", () => {
        const m = createTurnMachine("p1");
        m.send("TURN_ADVANCED", { playerId: "p2" });
        expect(m.state).toBe("action-phase");
        expect(m.context.currentPlayerId).toBe("p1");
    });

    it("ignores END_TURN / ALL_UNITS_MOVED while in declare-end-turn", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        m.send("END_TURN");
        m.send("ALL_UNITS_MOVED");
        expect(m.state).toBe("declare-end-turn");
    });

    it("ignores ATTACK_DECLARED while in declare-end-turn", () => {
        const m = createTurnMachine("p1");
        m.send("END_TURN");
        m.send("ATTACK_DECLARED");
        expect(m.state).toBe("declare-end-turn");
    });

    it("notifies subscribers on each transition and on subscribe()", () => {
        const m = createTurnMachine("p1");
        const trace: Array<{ state: string; player: string }> = [];
        m.subscribe((state, ctx) =>
            trace.push({ state, player: ctx.currentPlayerId }),
        );
        m.send("END_TURN");
        m.send("TURN_ADVANCED", { playerId: "p2" });
        expect(trace).toEqual([
            { state: "action-phase", player: "p1" },
            { state: "declare-end-turn", player: "p1" },
            { state: "action-phase", player: "p2" },
        ]);
    });

    it("attack pipeline: subscriber notified for all 4 phases", () => {
        const m = createTurnMachine("p1");
        const states: string[] = [];
        m.subscribe((state) => states.push(state));
        m.send("ATTACK_DECLARED");
        m.send("QUICK_PLAY_RESOLVED");
        m.send("COMBAT_RESOLVED");
        m.send("POST_COMBAT_RESOLVED");
        expect(states).toEqual([
            "action-phase",
            "quick-play",
            "combat",
            "post-combat",
            "action-phase",
        ]);
    });
});
```

---

## Verification

1. `pnpm --filter @runebound-tactics/shared tsc --noEmit` — zero type errors
2. `pnpm --filter @runebound-tactics/server tsc --noEmit` — zero type errors
3. `pnpm --filter @runebound-tactics/shared test` — all tests pass
4. Start server + two clients; confirm `GameState.turnPhase` initializes to `"action-phase"` in first state patch
5. Issue `attack_unit` as active player; confirm `turnPhase` cycles `quick-play → combat → post-combat → action-phase` in patch sequence and target HP updates in the `combat` patch
6. Issue `end_turn`; confirm `turnPhase` shows `declare-end-turn → action-phase` and `currentTurnId` switches to next player
7. Kill all enemy units; confirm `state.phase === "ended"`, `winnerId` set, no further `turnPhase` patches arrive
