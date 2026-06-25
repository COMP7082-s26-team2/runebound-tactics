# Implementation Plan: Combat Reaction Window — Card System Integration (BCOMP-188)

Wires the card system into the combat reaction window so that cards played during the window modify damage before `_resolvePendingAttack()` applies it. Depends on [COMBAT_REACTION_WINDOW.md](COMBAT_REACTION_WINDOW.md) and [COMBAT_REACTION_WINDOW_CLIENT.md](COMBAT_REACTION_WINDOW_CLIENT.md).

---

## Files

| File | Status | Change |
|---|---|---|
| `shared/src/game/cards/reaction-cards.ts` | **New** | Card blueprints, effect registry, `applyReactionEffects()` pure helper |
| `shared/src/game/index.ts` | Modify | Export new cards module |
| `server/src/rooms/GameRoom.ts` | Modify | Deck seeding in `_startGame`, `play_reaction_card` handler, `_applyReactionCardEffects()` call |
| `client/src/components/game/CombatReactionWindow.tsx` | Modify | Enable Play button, open `ReactionCardModal`, derive card list from state |
| `client/src/components/game/ReactionCardModal.tsx` | Modify | Render real cards from deck, emit `onPlayCard(cardName)` |
| `client/src/components/game/MultiplayerGame.tsx` | Modify | Pass `cardName` in `play_reaction_card` message |
| `shared/tests/reactionCardCombat.test.ts` | **New** | Unit tests for pure card-effect logic |

---

## 1. `shared/src/game/cards/reaction-cards.ts` — New file

```ts
import { CardType } from "../../schemas/Card";
import { computeAttackDamage } from "../units/unit-stats";

export interface CardEffect {
    attackBonus?: number;
    defenseBonus?: number;
}

export interface CardBlueprint {
    name: string;
    card_type: CardType;
    gold_cost: number;
    is_reaction: boolean;
    effect: CardEffect;
}

export const BATTLE_CRY: CardBlueprint = {
    name: "Battle Cry",
    card_type: CardType.CARD_STATUS_EFFECT,
    gold_cost: 0,
    is_reaction: true,
    effect: { attackBonus: 2 },
};

export const SHIELD_WALL: CardBlueprint = {
    name: "Shield Wall",
    card_type: CardType.CARD_STATUS_EFFECT,
    gold_cost: 0,
    is_reaction: true,
    effect: { defenseBonus: 2 },
};

export const STARTER_DECK_BLUEPRINTS: CardBlueprint[] = [
    BATTLE_CRY,
    SHIELD_WALL,
];

export const CARD_EFFECT_REGISTRY = new Map<string, CardEffect>([
    [BATTLE_CRY.name, BATTLE_CRY.effect],
    [SHIELD_WALL.name, SHIELD_WALL.effect],
]);

/**
 * Pure helper — apply all reaction card effects to a pending combat exchange.
 * Does not mutate schema objects. GameRoom calls this just before resolving
 * the pending attack, and tests call it directly.
 *
 * `cardsPlayed[].cardId` holds the card name (the FSM uses name as the stable ID).
 */
export function applyReactionEffects(
    cardsPlayed: Array<{ playerId: string; cardId: string }>,
    attackerOwnerId: string,
    defenderOwnerId: string,
    attacker: { baseAttackDamage: number; bonusAttackDamage: number },
    defender: { baseDefense: number; bonusDefense: number },
): { damage: number; attackBonus: number; defenseBonus: number } {
    let attackBonus = 0;
    let defenseBonus = 0;

    for (const entry of cardsPlayed) {
        const effect = CARD_EFFECT_REGISTRY.get(entry.cardId);
        if (!effect) continue;
        if (entry.playerId === attackerOwnerId) {
            attackBonus += effect.attackBonus ?? 0;
        } else if (entry.playerId === defenderOwnerId) {
            defenseBonus += effect.defenseBonus ?? 0;
        }
    }

    const effectiveAttacker = {
        baseAttackDamage: attacker.baseAttackDamage,
        bonusAttackDamage: attacker.bonusAttackDamage + attackBonus,
    };
    const effectiveDefender = {
        baseDefense: defender.baseDefense,
        bonusDefense: defender.bonusDefense + defenseBonus,
    };

    const damage = computeAttackDamage(effectiveAttacker, effectiveDefender);
    return { damage, attackBonus, defenseBonus };
}
```

---

## 2. `shared/src/game/index.ts` — Add export

```diff
 export * from "./ActionPointSystem";
 export * from "./grid-utils";
 export * from "./logic";
 export * from "./units/unit-stats";
 export * from "./units/unit-status";
+export * from "./cards/reaction-cards";
```

`shared/src/index.ts` already re-exports `* from "./game"`, so no further changes there.

---

## 3. `server/src/rooms/GameRoom.ts` — Three changes

### 3a. Add import

```diff
 import {
     ...
+    STARTER_DECK_BLUEPRINTS,
+    applyReactionEffects,
     ...
 } from "@runebound-tactics/shared";
```

### 3b. Seed decks in `_startGame()` (after `_spawnInitialUnits()`, line ~332)

```diff
     private _startGame(): void {
         console.log(`[${new Date().toISOString()}] [GameRoom] phase: setup → active`);
         this.state.phase = "active";
         this.state.currentTurnId = this._turnOrder[0] ?? "";

         this._spawnInitialUnits();
+        for (const slot of this.state.players.values()) {
+            slot.deck.initializeDeck(STARTER_DECK_BLUEPRINTS);
+            console.log(`[${new Date().toISOString()}] [GameRoom] deck: seeded ${slot.deck.cards.length} cards for ${slot.sessionId}`);
+        }
         this._rebuildReachabilityCache(this.state.currentTurnId);
         ...
     }
```

### 3c. Replace the `play_reaction_card` stub handler (line ~183)

The `"defender"` phase is the only player-active phase right now — `"defender-ally"` and `"attacker-ally"` auto-pass (multi-player placeholder). Card play is therefore scoped to the defender only in this ticket.

```ts
this.onMessage<{ cardName: string }>("play_reaction_card", (client, payload) => {
    if (!this._reactionMachine) return;
    if (this._reactionMachine.state !== "defender") return;

    const ctx = this._reactionMachine.context;
    if (client.sessionId !== ctx.defenderOwnerId) return;

    const slot = this.state.players.get(client.sessionId);
    if (!slot) return;

    const index = slot.deck.cards.findIndex(
        (c) => c.name === payload?.cardName && c.is_reaction,
    );
    if (index === -1) return;

    const card = slot.deck.cards[index];
    if (slot.gold < card.gold_cost) return;

    slot.gold -= card.gold_cost;
    slot.deck.cards.splice(index, 1);   // in-place; required by Colyseus ArraySchema
    slot.deck.discard(card);

    console.log(
        `[${new Date().toISOString()}] [GameRoom] play_reaction_card: ${client.sessionId} played "${card.name}"`,
    );

    this._reactionMachine.send("PLAY_CARD", {
        playerId: client.sessionId,
        cardId: card.name,             // name is the stable ID used by CARD_EFFECT_REGISTRY
    });
});
```

### 3d. Add `_applyReactionCardEffects()` and call it from `_onReactionPhase()`

New private method (place alongside `_resolvePendingAttack()`):

```ts
private _applyReactionCardEffects(): void {
    if (!this._pendingAttack || !this._reactionMachine) return;

    const { cardsPlayed, attackerOwnerId, defenderOwnerId } =
        this._reactionMachine.context;
    if (cardsPlayed.length === 0) return;

    const attacker = this.state.units.get(this._pendingAttack.attackerId);
    const defender = this.state.units.get(this._pendingAttack.targetId);
    if (!attacker || !defender) return;

    const { damage, attackBonus, defenseBonus } = applyReactionEffects(
        cardsPlayed,
        attackerOwnerId,
        defenderOwnerId,
        attacker,
        defender,
    );

    const oldDamage = this._pendingAttack.damage;
    const newHp = Math.max(0, defender.hp - damage);

    this._pendingAttack.damage = damage;
    this._pendingAttack.newHp = newHp;
    this._pendingAttack.defenderDied = newHp <= 0;

    console.log(
        `[${new Date().toISOString()}] [GameRoom] reaction-effects: attackBonus=${attackBonus} defenseBonus=${defenseBonus} damage ${oldDamage} → ${damage}`,
    );
}
```

Call it from the `"resolve"` case in `_onReactionPhase()` (line ~438), **before** the auto-pass:

```diff
         case "resolve":
             this._clearReactionTimer();
+            this._applyReactionCardEffects();
             this._reactionMachine?.send("REACTION_PASS");
             break;
```

`_resolvePendingAttack()` is unchanged — it already reads `pa.damage`, `pa.newHp`, and `pa.defenderDied` as authoritative final values.

---

## 4. `client/src/components/game/MultiplayerGame.tsx` — Update `playReactionCard`

```diff
-    function playReactionCard() {
-        room?.send("play_reaction_card", {});
-    }
+    function playReactionCard(cardName: string) {
+        room?.send("play_reaction_card", { cardName });
+    }
```

The `onPlay` prop passed to `CombatReactionWindow` updates accordingly: `onPlay={playReactionCard}`.

---

## 5. `client/src/components/game/CombatReactionWindow.tsx` — Enable the Play button

### 5a. Update props interface

```diff
 interface CombatReactionWindowProps {
     state: GameState;
     sessionId: string;
     onPass: () => void;
-    onPlay: () => void;
+    onPlay: (cardName: string) => void;
 }
```

### 5b. Derive card list and modal state

```diff
+import { useState } from "react";
+import { ReactionCardModal } from "./ReactionCardModal";
 ...

 export function CombatReactionWindow({ state, sessionId, onPass, onPlay }: CombatReactionWindowProps) {
+    const [isCardModalOpen, setIsCardModalOpen] = useState(false);

     // existing state/effects ...

+    const mySlot = (state.players as unknown as Map<string, {
+        gold: number;
+        deck: { cards: Array<{ name: string; gold_cost: number; is_reaction: boolean }> };
+    }>).get(sessionId);
+    const reactionCards = Array.from(mySlot?.deck.cards ?? []).filter((c) => c.is_reaction);
+    const playerGold = mySlot?.gold ?? 0;
```

### 5c. Enable the Play button and render the modal

```diff
-                    <span title="Card system coming soon">
-                        <Button type="secondary" disabled onClick={onPlay}>
-                            Play
-                        </Button>
-                    </span>
+                    <Button type="secondary" onClick={() => setIsCardModalOpen(true)}>
+                        Play
+                    </Button>
```

Below the return's outer `<div>`, add:

```tsx
<ReactionCardModal
    isOpen={isCardModalOpen}
    onClose={() => setIsCardModalOpen(false)}
    phase={state.reactionPhase}
    onPass={onPass}
    reactionCards={reactionCards}
    playerGold={playerGold}
    onPlayCard={(cardName) => {
        onPlay(cardName);
        setIsCardModalOpen(false);
    }}
/>
```

---

## 6. `client/src/components/game/ReactionCardModal.tsx` — Render real cards

### 6a. Update props interface

```diff
 interface ReactionCardModalProps {
     isOpen: boolean;
     onClose: () => void;
     phase: string;
     onPass: () => void;
+    reactionCards: Array<{ name: string; gold_cost: number }>;
+    playerGold: number;
+    onPlayCard: (cardName: string) => void;
 }
```

### 6b. Destructure new props

```diff
 export function ReactionCardModal({
     isOpen,
     onClose,
     phase,
     onPass,
+    reactionCards,
+    playerGold,
+    onPlayCard,
 }: ReactionCardModalProps) {
```

### 6c. Replace the static card area

Replace the static empty-state block with:

```tsx
{reactionCards.length === 0 ? (
    <div
        className="min-h-[180px] flex flex-col items-center justify-center gap-2 p-6"
        style={{ border: `1px dashed ${INK_500}` }}
    >
        <p className="text-sm" style={{ color: INK_300 }}>
            No cards in hand.
        </p>
        <p className="text-xs" style={{ color: INK_500 }}>
            Pass to let the exchange resolve.
        </p>
    </div>
) : (
    <div className="flex flex-col gap-2">
        {reactionCards.map((card) => (
            <button
                key={card.name}
                disabled={playerGold < card.gold_cost}
                onClick={() => onPlayCard(card.name)}
                className="flex items-center justify-between px-3 py-2 text-sm text-left"
                style={{
                    background: INK_500,
                    color: VELLUM_050,
                    opacity: playerGold < card.gold_cost ? 0.4 : 1,
                    cursor: playerGold < card.gold_cost ? "not-allowed" : "pointer",
                }}
            >
                <span>{card.name}</span>
                {card.gold_cost > 0 && (
                    <span style={{ color: BRASS_500 }}>{card.gold_cost}g</span>
                )}
            </button>
        ))}
    </div>
)}
```

Add the missing `VELLUM_050` constant at the top of the file (it is already present in `ReactionStrip.tsx`):

```diff
 const BRASS_500 = "#b8893d";
+const VELLUM_050 = "#f3eddc";
```

---

## 7. `shared/tests/reactionCardCombat.test.ts` — New file

```ts
import {
    applyReactionEffects,
    CARD_EFFECT_REGISTRY,
    BATTLE_CRY,
    SHIELD_WALL,
} from "../src/game/cards/reaction-cards";
import { computeAttackDamage } from "../src/game/units/unit-stats";

const attacker = { baseAttackDamage: 5, bonusAttackDamage: 0 };
const defender = { baseDefense: 2, bonusDefense: 0 };
const baseline = computeAttackDamage(attacker, defender); // 3

describe("CARD_EFFECT_REGISTRY", () => {
    it("contains Battle Cry with attackBonus: 2", () => {
        expect(CARD_EFFECT_REGISTRY.get(BATTLE_CRY.name)).toEqual({ attackBonus: 2 });
    });

    it("contains Shield Wall with defenseBonus: 2", () => {
        expect(CARD_EFFECT_REGISTRY.get(SHIELD_WALL.name)).toEqual({ defenseBonus: 2 });
    });
});

describe("applyReactionEffects", () => {
    it("returns unmodified damage when cardsPlayed is empty", () => {
        const { damage, attackBonus, defenseBonus } = applyReactionEffects(
            [], "attacker", "defender", attacker, defender,
        );
        expect(damage).toBe(baseline);
        expect(attackBonus).toBe(0);
        expect(defenseBonus).toBe(0);
    });

    it("Battle Cry played by attacker increases damage", () => {
        const { damage, attackBonus } = applyReactionEffects(
            [{ playerId: "attacker", cardId: BATTLE_CRY.name }],
            "attacker", "defender", attacker, defender,
        );
        expect(attackBonus).toBe(2);
        expect(damage).toBe(baseline + 2);
    });

    it("Shield Wall played by defender decreases damage (minimum 1)", () => {
        const { damage, defenseBonus } = applyReactionEffects(
            [{ playerId: "defender", cardId: SHIELD_WALL.name }],
            "attacker", "defender", attacker, defender,
        );
        expect(defenseBonus).toBe(2);
        expect(damage).toBe(Math.max(1, baseline - 2));
    });

    it("Battle Cry and Shield Wall together stack correctly", () => {
        const cards = [
            { playerId: "attacker", cardId: BATTLE_CRY.name },
            { playerId: "defender", cardId: SHIELD_WALL.name },
        ];
        const { damage } = applyReactionEffects(cards, "attacker", "defender", attacker, defender);
        // net delta = +2 attack, +2 defense → same as baseline
        expect(damage).toBe(baseline);
    });

    it("Battle Cry played by defender has no effect (wrong side)", () => {
        const { damage, attackBonus } = applyReactionEffects(
            [{ playerId: "defender", cardId: BATTLE_CRY.name }],
            "attacker", "defender", attacker, defender,
        );
        expect(attackBonus).toBe(0);
        expect(damage).toBe(baseline);
    });

    it("unknown card name is silently ignored", () => {
        const { damage } = applyReactionEffects(
            [{ playerId: "attacker", cardId: "nonexistent_card" }],
            "attacker", "defender", attacker, defender,
        );
        expect(damage).toBe(baseline);
    });

    it("damage is always at least 1 even with high defenseBonus", () => {
        const weakAttacker = { baseAttackDamage: 2, bonusAttackDamage: 0 };
        const strongDefender = { baseDefense: 5, bonusDefense: 0 };
        const cards = [
            { playerId: "defender", cardId: SHIELD_WALL.name },
        ];
        const { damage } = applyReactionEffects(
            cards, "attacker", "defender", weakAttacker, strongDefender,
        );
        expect(damage).toBeGreaterThanOrEqual(1);
    });
});
```

---

## Data flow after integration

```
attack_unit declared → _handleAttack() pre-computes damage → _pendingAttack set
  → TurnMachine: ATTACK_DECLARED → quick-play → _openReactionWindow()

[defender phase open]

play_reaction_card { cardName: "Shield Wall" }
  → validate: window open, phase=defender, sessionId=defenderOwnerId, card exists, gold ok
  → deduct gold, splice from deck.cards, discard(card)
  → _reactionMachine.send("PLAY_CARD", { playerId, cardId: "Shield Wall" })
  → FSM: cardsPlayed = [{ playerId, cardId: "Shield Wall" }]

pass_reaction (or timeout)
  → _reactionMachine.send("REACTION_PASS")
  → FSM: defender → defender-ally (auto-pass) → attacker-ally (auto-pass) → resolve

_onReactionPhase("resolve")
  → _applyReactionCardEffects()
       reads cardsPlayed, calls applyReactionEffects()
       _pendingAttack.damage / .newHp / .defenderDied updated
  → _reactionMachine.send("REACTION_PASS")
  → FSM: resolve → closed

_onReactionPhase("closed")
  → TurnMachine: QUICK_PLAY_RESOLVED → combat

_onTurnPhase("combat")
  → _resolvePendingAttack()   ← reads modified _pendingAttack fields; unchanged method
  → HP written / unit deleted
  → Colyseus patch broadcast to all clients
```

---

## Verification

1. `pnpm --filter @runebound-tactics/shared tsc --noEmit` — zero type errors
2. `pnpm --filter @runebound-tactics/server tsc --noEmit` — zero type errors
3. `pnpm --filter @runebound-tactics/shared test reactionCardCombat` — all 7 tests pass
4. `pnpm --filter @runebound-tactics/shared test` — all existing tests unaffected
5. Start server + two clients; issue an attack — confirm deck cards appear in the reaction modal for the defender
6. Play "Shield Wall" — confirm the server logs `reaction-effects: attackBonus=0 defenseBonus=2 damage X → Y` and the target HP drop is 2 less than a no-card baseline
7. Play "Battle Cry" as attacker (not yet possible — attacker-ally auto-passes; this is expected) — confirm modal does not appear during auto-pass phases
8. Pass without playing — confirm damage equals baseline (`_applyReactionCardEffects` returns early with empty `cardsPlayed`)
9. Confirm the played card is removed from the modal's card list after play (Colyseus ArraySchema splice propagates automatically)
