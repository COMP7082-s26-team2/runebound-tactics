# Implementation Plan: Gameplay Loop FSM

Implements the two-FSM architecture described in [`docs/design/GAMEPLAY_LOOP_FSM.md`](../design/GAMEPLAY_LOOP_FSM.md).

---

## Files

| File | Status | Change |
|---|---|---|
| `src/lib/game/systems/TurnSystem.ts` | Modify | Fix inverted `loop` flag |
| `src/lib/game/state/GameState.ts` | Modify | Add new data fields; sync `phase` on `transition()` |
| `src/lib/game/state/TurnFlow.ts` | **New** | Outer FSM for turn-resolution pipeline |
| `src/lib/game/state/index.ts` | Modify | Re-export `TurnFlow` |
| `src/lib/engine/world/World.ts` | Modify | Add `unitOwnership` store; update `spawnUnit` / `removeUnit` |
| `src/lib/game/systems/CombatSystem.ts` | Modify | Remove `world.removeUnit()` from `applyAttackResult()` |
| `src/lib/game/scenes/GridMovementScene.ts` | Modify | Wire EventBus, TurnSystem, TurnFlow, GameState; add ownership to spawns |
| `src/lib/game/systems/SelectionSystem.ts` | Modify | Add `_turnFlow` param; FSM transitions; ownership + outer-phase guards; declare-only attack |
| `src/components/scenes/GridMovementCanvas.tsx` | Modify | Add End Turn button + active player label overlay |
| `src/app/turn-test/page.tsx` | Modify | Update `loop` arg comment after flag fix |

---

## 1. `TurnSystem.ts` — Fix inverted `loop` flag

**Problem:** `loop=true` currently stops after one round (sets `_started=false`, emits `turn:sequence-end`). `loop=false` loops indefinitely. The semantics are inverted.

**Fix:** Invert the condition in `_advance()` and change the constructor default.

```diff
- if (this._loop) {
+ if (!this._loop) {
      this._started = false
      this._emit("turn:sequence-end", { round: this._round - 1 })
      return
  }
```

```diff
- constructor(participants = [], eventBus = null, loop = true) {
+ constructor(participants = [], eventBus = null, loop = false) {
```

`loop=false` (new default) = stop after one round. `loop=true` = cycle indefinitely.

**`turn-test/page.tsx`:** Already passes `loop=false` and labels it `"loop=false (one sequence per start)"`. After the fix this is correct — no value change needed, just verify the label still matches.

---

## 2. `GameState.ts` — Add data fields + sync `phase`

**Add three new public fields:**

```ts
pendingAttacks: Array<{ attackerId: EntityId; targetId: EntityId }> = [];
pendingDeaths: EntityId[] = [];
activePlayerId: string | null = null;
```

**The `TurnPhase` union already has `"moved"** from the CombatSystem merge — no change needed.

**Update `transition()`** to mirror `phase` so existing `switch (state.phase)` readers stay working:

```diff
  transition(nextName: TurnPhase) {
      ...
+     this.phase = nextName
      const prev = this._name
      this._current?.onExit?.(nextName)
      this._enter(nextName, prev)
  }
```

**Update `reset()`** to clear new fields:

```diff
  reset() {
      ...
+     this.selectedEntity = null
+     this.reachableTiles.clear()
+     this.reachableAttackableTiles.clear()
+     this.attackableEntities.clear()
+     this.pendingAttacks = []
+     this.pendingDeaths = []
+     this.activePlayerId = null
  }
```

---

## 3. `TurnFlow.ts` — New file

Create `src/lib/game/state/TurnFlow.ts`. Mirrors the FSM pattern from `GameState` but with its own phase union. Holds no game data.

```ts
import { EntityId } from "@/lib/engine";

export type TurnFlowPhase =
  | "action-phase"
  | "declare-end-turn"
  | "quick-play"
  | "combat"
  | "post-combat";

export type TurnFlowState = {
    onEnter?: (prev: TurnFlowPhase | null) => void
    onUpdate?: (deltaTime: number) => void
    onExit?: (next: TurnFlowPhase | null) => void
}

export class TurnFlow {
    private _states = new Map<TurnFlowPhase, TurnFlowState>();
    private _current: TurnFlowState | null = null;
    private _name: TurnFlowPhase | null = null;
    private _started = false;

    get current() { return this._name }
    get started() { return this._started }

    add(name: TurnFlowPhase, state: TurnFlowState) {
        this._states.set(name, state)
    }

    start(initialState: TurnFlowPhase) {
        if (this._started) throw new Error(`[TurnFlow] Already started`)
        this._started = true
        this._enter(initialState, null)
    }

    transition(nextName: TurnFlowPhase) {
        if (!this._started) throw new Error(`[TurnFlow] Call start() before transition()`)
        if (!this._states.has(nextName)) throw new Error(`[TurnFlow] Unknown state "${nextName}"`)
        const prev = this._name
        this._current?.onExit?.(nextName)
        this._enter(nextName, prev)
    }

    update(dTime: number) {
        if (!this._started) return
        this._current?.onUpdate?.(dTime)
    }

    reset() {
        if (this._started && this._current) this._current.onExit?.(null)
        this._current = null
        this._name = null
        this._started = false
    }

    private _enter(name: TurnFlowPhase, prevName: TurnFlowPhase | null) {
        if (!this._states.has(name)) throw new Error(`[TurnFlow] Unknown state "${name}"`)
        this._name = name
        this._current = this._states.get(name) || null
        this._current?.onEnter?.(prevName)
    }
}
```

**Add to `src/lib/game/state/index.ts`:**

```diff
+ export { TurnFlow, type TurnFlowPhase, type TurnFlowState } from "./TurnFlow"
```

---

## 4. `World.ts` — Add `unitOwnership`

```diff
+ public unitOwnership = new ComponentStore<string>();
```

```diff
  spawnUnit(
      coord: GridCoord,
      stats: UnitStatsData,
      appearance: AppearanceData,
+     owner?: string,
  ): EntityId {
      const entityId = this.entityManager.createEntity();
      this.gridPositions.set(entityId, coord);
      this.unitStats.set(entityId, stats);
      this.unitAppearance.set(entityId, appearance);
      this.occupancyMap.set(cellKey(coord), entityId);
+     if (owner !== undefined) this.unitOwnership.set(entityId, owner);
      return entityId;
  }
```

```diff
  removeUnit(entityId: EntityId): void {
      const coord = this.gridPositions.get(entityId);
      if (coord) this.occupancyMap.delete(cellKey(coord));
      this.gridPositions.remove(entityId);
      this.unitStats.remove(entityId);
      this.unitAppearance.remove(entityId);
+     this.unitOwnership.remove(entityId);
      this.entityManager.removeEntity(entityId);
  }
```

---

## 5. `CombatSystem.ts` — Remove unit removal from `applyAttackResult()`

`applyAttackResult()` currently calls `world.removeUnit()` when `defenderDied`. Remove that branch — death removal is now the exclusive responsibility of `post-combat` in `TurnFlow`. The method always updates HP (to 0 if the unit died, keeping it alive until post-combat).

```diff
  applyAttackResult(result, _attackerId, targetId) {
      const defender = this._world.unitStats.get(targetId)
      if (!defender) throw new Error(...)

      console.log(...)

-     if (result.defenderDied) {
-         this._world.removeUnit(targetId)
-     } else {
-         this._world.unitStats.set(targetId, { ...defender, health: result.newDefenderHp })
-     }
+     this._world.unitStats.set(targetId, { ...defender, health: result.newDefenderHp })
  }
```

> Note: `applyAttackResult()` is not called anywhere in the new flow — `combat` phase in `TurnFlow` calls `resolveAttack()` directly and handles HP + death queuing inline. `applyAttackResult()` is left updated but dormant for now; it can be removed or repurposed later.

---

## 6. `GridMovementScene.ts` — Wire everything together

**New instance fields** (declare before `constructor`):

```ts
public eventBus = new EventBus();
public turnFlow = new TurnFlow();
public turnSystem!: TurnSystem;
```

**In `init()`**, after creating `world` and `combatSystem`:

### Register TurnFlow phases

```ts
this.turnFlow.add("action-phase", {
    onEnter: () => { this.state.transition("idle") }
})

this.turnFlow.add("declare-end-turn", {
    onEnter: () => { queueMicrotask(() => this.turnFlow.transition("quick-play")) }
})

this.turnFlow.add("quick-play", {
    onEnter: () => { queueMicrotask(() => this.turnFlow.transition("combat")) }
})

this.turnFlow.add("combat", {
    onEnter: () => {
        const world = this._world!
        for (const { attackerId, targetId } of this.state.pendingAttacks) {
            const result = combatSystem.resolveAttack(attackerId, targetId)
            if (!result) continue
            if (result.defenderDied) {
                this.state.pendingDeaths.push(targetId)
            } else {
                const defender = world.unitStats.get(targetId)!
                world.unitStats.set(targetId, { ...defender, health: result.newDefenderHp })
            }
        }
        this.state.pendingAttacks = []
        queueMicrotask(() => this.turnFlow.transition("post-combat"))
    }
})

this.turnFlow.add("post-combat", {
    onEnter: () => {
        const world = this._world!
        for (const id of this.state.pendingDeaths) {
            world.removeUnit(id)
        }
        this.state.pendingDeaths = []
        this.turnSystem.endTurn()
    }
})
```

### Register GameState phases

```ts
this.state.add("idle", {
    onEnter: () => {
        this.state.selectedEntity = null
        this.state.reachableTiles.clear()
        this.state.reachableAttackableTiles.clear()
        this.state.attackableEntities.clear()
        this.state.activePlayerId = this.turnSystem.activeId
    }
})
this.state.add("selected", {})
this.state.add("awaiting-move", {
    onEnter: () => { this.state.attackableEntities.clear() }
})
this.state.add("moved", {})
```

### Wire EventBus → TurnFlow

```ts
this.eventBus.on("turn:begin", () => {
    this.turnFlow.transition("action-phase")
})
```

### Start sequence

```ts
this.turnSystem = new TurnSystem(
    [{ id: "player1" }, { id: "player2" }],
    this.eventBus,
    true   // loop=true: cycle indefinitely
)

this.state.start("idle")
this.turnFlow.start("action-phase")
// turnFlow.start fires action-phase.onEnter → state.transition("idle")
// → idle.onEnter: activePlayerId = null (turnSystem not started yet)

this.turnSystem.start("player1")
// emits "turn:begin" → listener fires → turnFlow.transition("action-phase")
// → action-phase.onEnter → state.transition("idle")
// → idle.onEnter: activePlayerId = "player1"
```

### Update `spawnUnit` calls

```diff
- this._world.spawnUnit({ q: 2, r: 5 }, { ...warriorStats }, { color: "red" })
+ this._world.spawnUnit({ q: 2, r: 5 }, { ...warriorStats }, { color: "red" }, "player1")

- this._world.spawnUnit({ q: 5, r: 6 }, { ...skeletonStats }, { color: "purple" })
+ this._world.spawnUnit({ q: 5, r: 6 }, { ...skeletonStats }, { color: "purple" }, "player2")

- this._world.spawnUnit({ q: 5, r: 8 }, { ...skeletonStats }, { color: "purple" })
+ this._world.spawnUnit({ q: 5, r: 8 }, { ...skeletonStats }, { color: "purple" }, "player2")
```

### Add `endTurn()` method

```ts
endTurn(): void {
    if (this.turnFlow.current === "action-phase") {
        this.turnFlow.transition("declare-end-turn")
    }
}
```

### Pass `turnFlow` to `SelectionSystem`

```diff
  new SelectionSystem(
      this._world,
      CELL_SIZE,
      this.state,
      this.input,
      tweens,
      combatSystem,
+     this.turnFlow,
  )
```

---

## 7. `SelectionSystem.ts` — Guards + FSM transitions + declare-only attack

**Add `_turnFlow` constructor parameter:**

```diff
  constructor(
      private _world: World,
      private _cellSize: number,
      private _state: GameState,
      private _input: InputSystem,
      private _tweens: TweenManager,
      private _combat: CombatSystem,
+     private _turnFlow: TurnFlow,
  ) {}
```

**Top-of-`update()` guard:**

```diff
  update(_dt: number): void {
+     if (this._turnFlow.current !== "action-phase") return;
      if (!this._input.isMouseButtonJustPressed(0)) return;
```

**Remove debug log** in `_handleIdleClick()`:

```diff
- console.log("[_handleIdleClick]");
```

**Add ownership guard** in `_handleIdleClick()`:

```diff
  private _handleIdleClick(occupant: EntityId | null): void {
      if (occupant === null) return;
+     if (this._world.unitOwnership.get(occupant) !== this._state.activePlayerId) return;
      this._select(occupant);
  }
```

**Replace all direct phase assignments with `transition()`:**

```diff
- this._state.phase = "selected";
+ this._state.transition("selected");

- this._state.phase = "awaiting-move";
+ this._state.transition("awaiting-move");

- this._state.phase = "moved";
+ this._state.transition("moved");

- this._state.phase = "idle";
+ this._state.transition("idle");
```

**Rename `_attack()` → `_declareAttack()` — queue only:**

```diff
- private _attack(attackerId: EntityId, targetId: EntityId): void {
-     const result = this._combat.resolveAttack(attackerId, targetId)
-     if (result) {
-         this._combat.applyAttackResult(result, attackerId, targetId)
-     }
- }
+ private _declareAttack(attackerId: EntityId, targetId: EntityId): void {
+     this._state.pendingAttacks.push({ attackerId, targetId });
+ }
```

Update both call sites:

```diff
- this._attack(this._state.selectedEntity!, occupant);
+ this._declareAttack(this._state.selectedEntity!, occupant);
```

```diff
- this._attack(this._state.selectedEntity!, occupant);   // in _handleMovedClick
+ this._declareAttack(this._state.selectedEntity!, occupant);
```

---

## 8. `GridMovementCanvas.tsx` — React UI overlay

Add `sceneRef` and `activePlayer` state. Subscribe to `turn:begin` on the scene's `eventBus`. Wrap the canvas in a relative container with label and button overlay.

```diff
- import { useEffect, useRef } from "react";
+ import { useEffect, useRef, useState } from "react";

  export default function GridMovementCanvas({ debug = false }) {
      const canvasRef = useRef<HTMLCanvasElement | null>(null);
+     const sceneRef = useRef<GridMovementScene | null>(null);
+     const [activePlayer, setActivePlayer] = useState("player1");

      useEffect(() => {
          if (!canvasRef.current) return;
          const canvas = canvasRef.current;
          const engine = new GameEngine({ canvas, width: 800, height: 800, fixedDelta: 1/60, debug });
          const scene = new GridMovementScene(canvas);
+         sceneRef.current = scene;
          engine.scenes.register("main", scene);
          engine.scenes.switch("main");
          engine.preDraw = (ctx) => { ctx.clearRect(0, 0, canvas.width, canvas.height); };
          engine.start();

+         const onTurnBegin = (data: unknown) => {
+             const { participant } = data as { participant: { id: string } };
+             setActivePlayer(participant.id);
+         };
+         scene.eventBus.on("turn:begin", onTurnBegin);
+
          return () => {
              engine.stop();
+             scene.eventBus.off("turn:begin", onTurnBegin);
          };
      }, []);

      return (
-         <canvas ref={canvasRef} style={{ width: "800px", height: "800px", display: "block" }} />
+         <div style={{ position: "relative", width: "800px", height: "800px" }}>
+             <canvas ref={canvasRef} style={{ display: "block", width: "800px", height: "800px" }} />
+             <div style={{ position: "absolute", top: 8, left: 8, color: "white", background: "rgba(0,0,0,0.5)", padding: "4px 8px" }}>
+                 Turn: {activePlayer}
+             </div>
+             <button
+                 style={{ position: "absolute", bottom: 8, right: 8 }}
+                 onClick={() => sceneRef.current?.endTurn()}
+             >
+                 End Turn
+             </button>
+         </div>
      );
  }
```

---

## Verification

1. `pnpm tsc --noEmit` — no type errors across all modified files
2. Navigate to the grid movement page; confirm **"Turn: player1"** label in top-left
3. Click the red Warrior — blue movement range, green attack-position tiles, and red attackable enemies appear
4. Click an attackable enemy (red) — transitions to `awaiting-move`; no HP change yet
5. Click End Turn — label cycles to **"Turn: player2"**; Warrior's attack resolves; if target HP ≤ 0, unit disappears after the End Turn click
6. As player2, click the red Warrior — nothing happens (ownership guard)
7. Click a purple Skeleton, move it, click End Turn — cycles back to player1
8. Visit `/turn-test` — TurnSystem still works; `loop=false` still means one sequence per start
