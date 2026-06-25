# Implementation Plan: Combat Reaction Window FSM

Implements the `ReactionWindowMachine` described in [`docs/design/COMBAT_REACTION_WINDOW.md`](../design/COMBAT_REACTION_WINDOW.md).

---

## Files

| File | Status | Change |
|---|---|---|
| `shared/src/fsm/reaction/events.ts` | **New** | `ReactionWindowState`, `ReactionWindowEvent`, `ReactionWindowContext` types |
| `shared/src/fsm/reaction/states/DefenderState.ts` | **New** | `REACTION_PASS` / `REACTION_TIMEOUT` → `"defender-ally"`; `PLAY_CARD` self-loop |
| `shared/src/fsm/reaction/states/DefenderAllyState.ts` | **New** | `REACTION_PASS` / `REACTION_TIMEOUT` → `"attacker-ally"`; `PLAY_CARD` self-loop |
| `shared/src/fsm/reaction/states/AttackerAllyState.ts` | **New** | `REACTION_PASS` / `REACTION_TIMEOUT` → `"resolve"`; `PLAY_CARD` self-loop |
| `shared/src/fsm/reaction/states/ResolveState.ts` | **New** | `REACTION_PASS` / `REACTION_TIMEOUT` → `"closed"`; `PLAY_CARD` → `null` |
| `shared/src/fsm/reaction/states/ClosedState.ts` | **New** | All events → `null` (terminal) |
| `shared/src/fsm/reaction/ReactionWindowMachine.ts` | **New** | `createReactionWindowMachine(attackerOwnerId, defenderOwnerId)` factory |
| `shared/src/fsm/index.ts` | Modify | Export new reaction machine types and factory |
| `shared/src/schemas/GameState.ts` | Modify | Add `reactionPhase: string = ""` |
| `server/src/rooms/GameRoom.ts` | Modify | `REACTION_TIMEOUT_MS` constant; new fields; replace `quick-play` handler; add subscriber, timer helpers, and two new message handlers |
| `shared/tests/reactionWindowMachine.test.ts` | **New** | Unit tests for all 5 states + full pipeline |

---

## 1. `shared/src/fsm/reaction/events.ts` — New file

```ts
export type ReactionWindowState =
    | "defender"
    | "defender-ally"
    | "attacker-ally"
    | "resolve"
    | "closed";

export type ReactionWindowEvent =
    | "PLAY_CARD"
    | "REACTION_PASS"
    | "REACTION_TIMEOUT";

export interface ReactionWindowContext {
    attackerOwnerId: string;
    defenderOwnerId: string;
    cardsPlayed: Array<{ playerId: string; cardId: string }>;
}
```

---

## 2. State classes — New files

All follow the `StateBase<ReactionWindowContext, ReactionWindowEvent>` pattern. All are pure — no Colyseus or host-only calls.

### `shared/src/fsm/reaction/states/DefenderState.ts`

```ts
import { StateBase, type TransitionResult } from "../../StateBase";
import type { ReactionWindowContext, ReactionWindowEvent } from "../events";

export class DefenderState extends StateBase<ReactionWindowContext, ReactionWindowEvent> {
    readonly name = "defender";

    handle(
        event: ReactionWindowEvent,
        ctx: ReactionWindowContext,
        payload?: unknown,
    ): TransitionResult<ReactionWindowContext> {
        if (event === "REACTION_PASS" || event === "REACTION_TIMEOUT") {
            return "defender-ally";
        }
        if (event === "PLAY_CARD") {
            const p = payload as { playerId: string; cardId: string };
            return {
                target: "defender",
                action: (c) => ({
                    cardsPlayed: [...c.cardsPlayed, { playerId: p.playerId, cardId: p.cardId }],
                }),
            };
        }
        return null;
    }
}
```

### `shared/src/fsm/reaction/states/DefenderAllyState.ts`

```ts
import { StateBase, type TransitionResult } from "../../StateBase";
import type { ReactionWindowContext, ReactionWindowEvent } from "../events";

/** Placeholder: defending player's ally window (multi-player pending). */
export class DefenderAllyState extends StateBase<ReactionWindowContext, ReactionWindowEvent> {
    readonly name = "defender-ally";

    handle(
        event: ReactionWindowEvent,
        ctx: ReactionWindowContext,
        payload?: unknown,
    ): TransitionResult<ReactionWindowContext> {
        if (event === "REACTION_PASS" || event === "REACTION_TIMEOUT") {
            return "attacker-ally";
        }
        if (event === "PLAY_CARD") {
            const p = payload as { playerId: string; cardId: string };
            return {
                target: "defender-ally",
                action: (c) => ({
                    cardsPlayed: [...c.cardsPlayed, { playerId: p.playerId, cardId: p.cardId }],
                }),
            };
        }
        return null;
    }
}
```

### `shared/src/fsm/reaction/states/AttackerAllyState.ts`

```ts
import { StateBase, type TransitionResult } from "../../StateBase";
import type { ReactionWindowContext, ReactionWindowEvent } from "../events";

/** Placeholder: attacking player's ally window (multi-player pending). */
export class AttackerAllyState extends StateBase<ReactionWindowContext, ReactionWindowEvent> {
    readonly name = "attacker-ally";

    handle(
        event: ReactionWindowEvent,
        ctx: ReactionWindowContext,
        payload?: unknown,
    ): TransitionResult<ReactionWindowContext> {
        if (event === "REACTION_PASS" || event === "REACTION_TIMEOUT") {
            return "resolve";
        }
        if (event === "PLAY_CARD") {
            const p = payload as { playerId: string; cardId: string };
            return {
                target: "attacker-ally",
                action: (c) => ({
                    cardsPlayed: [...c.cardsPlayed, { playerId: p.playerId, cardId: p.cardId }],
                }),
            };
        }
        return null;
    }
}
```

### `shared/src/fsm/reaction/states/ResolveState.ts`

```ts
import { StateBase, type TransitionResult } from "../../StateBase";
import type { ReactionWindowContext, ReactionWindowEvent } from "../events";

/** All cards are locked in; window is closing. PLAY_CARD is ignored. */
export class ResolveState extends StateBase<ReactionWindowContext, ReactionWindowEvent> {
    readonly name = "resolve";

    handle(
        event: ReactionWindowEvent,
        _ctx: ReactionWindowContext,
        _payload?: unknown,
    ): TransitionResult<ReactionWindowContext> {
        if (event === "REACTION_PASS" || event === "REACTION_TIMEOUT") {
            return "closed";
        }
        return null;
    }
}
```

### `shared/src/fsm/reaction/states/ClosedState.ts`

```ts
import { StateBase, type TransitionResult } from "../../StateBase";
import type { ReactionWindowContext, ReactionWindowEvent } from "../events";

/** Terminal state. GameRoom subscriber fires QUICK_PLAY_RESOLVED. */
export class ClosedState extends StateBase<ReactionWindowContext, ReactionWindowEvent> {
    readonly name = "closed";

    handle(
        _event: ReactionWindowEvent,
        _ctx: ReactionWindowContext,
        _payload?: unknown,
    ): TransitionResult<ReactionWindowContext> {
        return null;
    }
}
```

---

## 3. `shared/src/fsm/reaction/ReactionWindowMachine.ts` — New file

```ts
import { Machine } from "../Machine";
import { DefenderState } from "./states/DefenderState";
import { DefenderAllyState } from "./states/DefenderAllyState";
import { AttackerAllyState } from "./states/AttackerAllyState";
import { ResolveState } from "./states/ResolveState";
import { ClosedState } from "./states/ClosedState";
import type { ReactionWindowContext, ReactionWindowEvent } from "./events";

export type ReactionWindowMachine = Machine<ReactionWindowContext, ReactionWindowEvent>;

export function createReactionWindowMachine(
    attackerOwnerId: string,
    defenderOwnerId: string,
): ReactionWindowMachine {
    return new Machine<ReactionWindowContext, ReactionWindowEvent>({
        initial: "defender",
        context: { attackerOwnerId, defenderOwnerId, cardsPlayed: [] },
        states: [
            new DefenderState(),
            new DefenderAllyState(),
            new AttackerAllyState(),
            new ResolveState(),
            new ClosedState(),
        ],
    });
}
```

---

## 4. `shared/src/fsm/index.ts` — Add exports

```diff
 // Turn machine
 export { createTurnMachine } from "./turn/TurnMachine";
 ...
+
+// Reaction window machine
+export { createReactionWindowMachine } from "./reaction/ReactionWindowMachine";
+export type { ReactionWindowMachine } from "./reaction/ReactionWindowMachine";
+export type {
+    ReactionWindowState,
+    ReactionWindowEvent,
+    ReactionWindowContext,
+} from "./reaction/events";
```

---

## 5. `shared/src/schemas/GameState.ts` — Add `reactionPhase`

```diff
     @type("string") turnPhase: string = "action-phase";
+
+    /**
+     * Active sub-phase of the reaction window.
+     * Values: "defender" | "defender-ally" | "attacker-ally" | "resolve" | "" (outside window)
+     * Written exclusively by the GameRoom ReactionWindowMachine subscriber.
+     */
+    @type("string") reactionPhase: string = "";
```

---

## 6. `server/src/rooms/GameRoom.ts` — Full integration

### 6a. Add imports

```diff
 import {
     ...
     createTurnMachine,
     type TurnMachine,
+    createReactionWindowMachine,
+    type ReactionWindowMachine,
     ...
 } from "@runebound-tactics/shared";
```

### 6b. Add constant (before `GameRoom` class)

```ts
const REACTION_TIMEOUT_MS = 10_000;
```

### 6c. Add private fields

```diff
     private _pendingAttack: PendingAttack | null = null;
+    private _reactionMachine: ReactionWindowMachine | null = null;
+    private _reactionTimer: ReturnType<typeof setTimeout> | null = null;
```

### 6d. Add `pass_reaction` message handler in `onCreate()` (after the `end_turn` handler)

```ts
this.onMessage("pass_reaction", (client) => {
    if (!this._reactionMachine) return;
    const phase = this._reactionMachine.state;
    const ctx = this._reactionMachine.context;
    const expected =
        phase === "defender" ? ctx.defenderOwnerId :
        phase === "attacker-ally" ? ctx.attackerOwnerId :
        null;
    if (expected === null || client.sessionId !== expected) return;
    this._clearReactionTimer();
    this._reactionMachine.send("REACTION_PASS");
});
```

### 6e. Add `play_reaction_card` message handler in `onCreate()` (after `pass_reaction`)

```ts
this.onMessage<{ cardId: string }>("play_reaction_card", (client, payload) => {
    // Card system pending — reject all cards until is_reaction validation is wired.
    console.log(`[${new Date().toISOString()}] [GameRoom] play_reaction_card: rejected (card system pending) from ${client.sessionId}`);
    void client;
    void payload;
});
```

### 6f. Replace `quick-play` branch in `_onTurnPhase()`

```diff
             case "quick-play":
-                console.log(`[${new Date().toISOString()}] [GameRoom] quick-play: no opponent responses`);
-                this._turnMachine.send("QUICK_PLAY_RESOLVED");
+                this._openReactionWindow();
                 break;
```

### 6g. Add `_openReactionWindow()` method (after `_onTurnPhase()`)

```ts
private _openReactionWindow(): void {
    const pa = this._pendingAttack;
    if (!pa) {
        this._turnMachine.send("QUICK_PLAY_RESOLVED");
        return;
    }

    const attackerUnit = this.state.units.get(pa.attackerId);
    const defenderUnit = this.state.units.get(pa.targetId);
    if (!attackerUnit || !defenderUnit) {
        this._turnMachine.send("QUICK_PLAY_RESOLVED");
        return;
    }

    this._reactionMachine = createReactionWindowMachine(
        attackerUnit.ownerId,
        defenderUnit.ownerId,
    );
    this._reactionMachine.subscribe((phase) => this._onReactionPhase(phase));
}
```

### 6h. Add `_onReactionPhase()` subscriber (after `_openReactionWindow()`)

```ts
private _onReactionPhase(phase: string): void {
    console.log(`[${new Date().toISOString()}] [GameRoom] reactionPhase: ${phase}`);
    this.state.reactionPhase = phase === "closed" ? "" : phase;

    const ctx = this._reactionMachine?.context;
    const activePlayer = this._activeReactionPlayer(phase, ctx?.attackerOwnerId, ctx?.defenderOwnerId);
    this.broadcast("reaction_phase", { phase, activePlayer });

    switch (phase) {
        case "defender":
            this._startReactionTimer();
            break;

        case "defender-ally":
            this._clearReactionTimer();
            this._startReactionTimer();
            this._reactionMachine?.send("REACTION_PASS");  // placeholder: auto-pass
            break;

        case "attacker-ally":
            this._clearReactionTimer();
            this._startReactionTimer();
            this._reactionMachine?.send("REACTION_PASS");  // placeholder: auto-pass
            break;

        case "resolve":
            this._clearReactionTimer();
            this._reactionMachine?.send("REACTION_PASS");
            break;

        case "closed":
            this._clearReactionTimer();
            this._reactionMachine = null;
            this._turnMachine.send("QUICK_PLAY_RESOLVED");
            break;
    }
}
```

### 6i. Add `_activeReactionPlayer()` helper (after `_onReactionPhase()`)

```ts
private _activeReactionPlayer(
    phase: string,
    attackerOwnerId?: string,
    defenderOwnerId?: string,
): string {
    if (phase === "defender") return defenderOwnerId ?? "";
    if (phase === "attacker-ally") return attackerOwnerId ?? "";
    return "";
}
```

### 6j. Add `_startReactionTimer()` and `_clearReactionTimer()` helpers (after `_activeReactionPlayer()`)

```ts
private _startReactionTimer(): void {
    this._clearReactionTimer();
    this._reactionTimer = setTimeout(() => {
        if (!this._reactionMachine) return;
        this._clearReactionTimer();
        this._reactionMachine.send("REACTION_TIMEOUT");
    }, REACTION_TIMEOUT_MS);
}

private _clearReactionTimer(): void {
    if (this._reactionTimer !== null) {
        clearTimeout(this._reactionTimer);
        this._reactionTimer = null;
    }
}
```

---

## 7. `shared/tests/reactionWindowMachine.test.ts` — New file

```ts
import { createReactionWindowMachine } from "../src/fsm/reaction/ReactionWindowMachine";

describe("reactionWindowMachine", () => {
    const make = () =>
        createReactionWindowMachine("attacker-session", "defender-session");

    it("starts in defender with correct context", () => {
        const m = make();
        expect(m.state).toBe("defender");
        expect(m.context.attackerOwnerId).toBe("attacker-session");
        expect(m.context.defenderOwnerId).toBe("defender-session");
        expect(m.context.cardsPlayed).toEqual([]);
    });

    it("REACTION_PASS advances full pipeline: defender → closed", () => {
        const m = make();
        m.send("REACTION_PASS");
        expect(m.state).toBe("defender-ally");
        m.send("REACTION_PASS");
        expect(m.state).toBe("attacker-ally");
        m.send("REACTION_PASS");
        expect(m.state).toBe("resolve");
        m.send("REACTION_PASS");
        expect(m.state).toBe("closed");
    });

    it("REACTION_TIMEOUT follows same transitions as REACTION_PASS from each state", () => {
        const m = make();
        m.send("REACTION_TIMEOUT");
        expect(m.state).toBe("defender-ally");
        m.send("REACTION_TIMEOUT");
        expect(m.state).toBe("attacker-ally");
        m.send("REACTION_TIMEOUT");
        expect(m.state).toBe("resolve");
        m.send("REACTION_TIMEOUT");
        expect(m.state).toBe("closed");
    });

    it("PLAY_CARD self-loops in defender and appends to cardsPlayed", () => {
        const m = make();
        m.send("PLAY_CARD", { playerId: "defender-session", cardId: "shield_bash" });
        expect(m.state).toBe("defender");
        expect(m.context.cardsPlayed).toEqual([
            { playerId: "defender-session", cardId: "shield_bash" },
        ]);
    });

    it("PLAY_CARD self-loops in defender-ally and attacker-ally", () => {
        const m = make();
        m.send("REACTION_PASS");
        m.send("PLAY_CARD", { playerId: "defender-session", cardId: "ally_shield" });
        expect(m.state).toBe("defender-ally");
        m.send("REACTION_PASS");
        m.send("PLAY_CARD", { playerId: "attacker-session", cardId: "rally" });
        expect(m.state).toBe("attacker-ally");
        expect(m.context.cardsPlayed).toHaveLength(2);
    });

    it("PLAY_CARD is ignored in resolve", () => {
        const m = make();
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        expect(m.state).toBe("resolve");
        m.send("PLAY_CARD", { playerId: "defender-session", cardId: "last_stand" });
        expect(m.state).toBe("resolve");
        expect(m.context.cardsPlayed).toHaveLength(0);
    });

    it("all events are ignored in closed (terminal state)", () => {
        const m = make();
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        expect(m.state).toBe("closed");
        m.send("REACTION_PASS");
        m.send("REACTION_TIMEOUT");
        m.send("PLAY_CARD", { playerId: "p1", cardId: "c1" });
        expect(m.state).toBe("closed");
    });

    it("subscriber notified for each transition (full pipeline trace)", () => {
        const m = make();
        const states: string[] = [];
        m.subscribe((state) => states.push(state));
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        expect(states).toEqual([
            "defender",
            "defender-ally",
            "attacker-ally",
            "resolve",
            "closed",
        ]);
    });

    it("context attackerOwnerId and defenderOwnerId preserved throughout", () => {
        const m = make();
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        expect(m.context.attackerOwnerId).toBe("attacker-session");
        expect(m.context.defenderOwnerId).toBe("defender-session");
    });
});
```

---

## Verification

1. `pnpm --filter @runebound-tactics/shared tsc --noEmit` — zero type errors
2. `pnpm --filter @runebound-tactics/server tsc --noEmit` — zero type errors
3. `pnpm --filter @runebound-tactics/shared test` — all existing + new `reactionWindowMachine` tests pass
4. Start server + two clients; issue an attack — confirm `state.reactionPhase` cycles `defender → defender-ally → attacker-ally → resolve → ""` in the broadcasted state patch
5. Confirm `state.reactionPhase` is `""` during normal `move_unit` and `end_turn` flow
6. As the defending player, send `pass_reaction` immediately after an attack — confirm window advances without waiting for the full `REACTION_TIMEOUT_MS` timeout
7. Do NOT send `pass_reaction` — confirm window auto-advances after `REACTION_TIMEOUT_MS`
8. Send `pass_reaction` from the attacker during the `defender` phase — confirm it is ignored and the timer continues
9. Confirm `turnPhase` still cycles correctly — `quick-play → combat → post-combat → action-phase` — after the reaction window closes and damage resolves
