# Implementation Plan: Combat Reaction Window — Role-Based Card Filtering (BCOMP-196)

Restricts which reaction cards are shown to and playable by each combatant. Attacker-only cards (e.g. "Battle Cry") are hidden from the defender; defender-only cards (e.g. "Shield Wall") are hidden from the attacker. Depends on [COMBAT_REACTION_WINDOW_CARD_INTEGRATION.md](COMBAT_REACTION_WINDOW_CARD_INTEGRATION.md).

---

## Files

| File | Status | Change |
|---|---|---|
| `shared/src/game/cards/reaction-cards.ts` | Modify | Add `role?` to `CardBlueprint`; set `"attacker"` / `"defender"` on existing blueprints |
| `shared/src/schemas/Card.ts` | Modify | Add `@type("string") role` field; update constructor and `initializeDeck` |
| `server/src/rooms/GameRoom.ts` | Modify | Role guard in `play_reaction_card`; extend `reaction_phase` broadcast with owner IDs |
| `client/src/components/game/CombatReactionWindow.tsx` | Modify | Track owner IDs from broadcast; derive `combatRole`; add role filter to card list |
| `shared/tests/reactionCardCombat.test.ts` | Modify | New `describe` block for blueprint role field and filter logic |

---

## 1. `shared/src/game/cards/reaction-cards.ts` — Add `role` to blueprint

Add optional `role` field to `CardBlueprint` and set it on both existing blueprints:

```diff
 export interface CardBlueprint {
     name: string;
     card_type: CardType;
     gold_cost: number;
     is_reaction: boolean;
+    role?: "attacker" | "defender";
     effect: CardEffect;
 }

 export const BATTLE_CRY: CardBlueprint = {
     name: "Battle Cry",
     card_type: CardType.CARD_STATUS_EFFECT,
     gold_cost: 0,
     is_reaction: true,
+    role: "attacker",
     effect: { attackBonus: 2 },
 };

 export const SHIELD_WALL: CardBlueprint = {
     name: "Shield Wall",
     card_type: CardType.CARD_STATUS_EFFECT,
     gold_cost: 0,
     is_reaction: true,
+    role: "defender",
     effect: { defenseBonus: 2 },
 };
```

Cards with no `role` field are neutral and visible to both combatants. `applyReactionEffects` and `CARD_EFFECT_REGISTRY` are unchanged.

---

## 2. `shared/src/schemas/Card.ts` — Add `role` to schema

Add the synchronized field, extend the constructor, and update `initializeDeck`:

```diff
 export class Card extends Schema {
     @type("string") name: string;
     @type("string") card_type: CardType;
     @type("number") gold_cost: number;
     @type("boolean") is_reaction: boolean = false;
+    @type("string") role: string = "";

-    constructor(name: string, card_type: CardType, gold_cost: number, is_reaction: boolean) {
+    constructor(name: string, card_type: CardType, gold_cost: number, is_reaction: boolean, role: string = "") {
         super();
         this.name = name;
         this.card_type = card_type;
         this.gold_cost = gold_cost;
         this.is_reaction = is_reaction;
+        this.role = role;
     }
 }
```

```diff
-    initializeDeck(blueprints: Array<{ name: string; card_type: CardType; gold_cost: number; is_reaction: boolean }>) {
+    initializeDeck(blueprints: Array<{ name: string; card_type: CardType; gold_cost: number; is_reaction: boolean; role?: string }>) {
         this.cards = new ArraySchema<Card>();
         this.discardPile = new ArraySchema<Card>();

         for (const blueprint of blueprints) {
             this.cards.push(
                 new Card(
                     blueprint.name,
                     blueprint.card_type,
                     blueprint.gold_cost,
                     blueprint.is_reaction,
+                    blueprint.role ?? "",
                 )
             );
         }
     }
```

The `role` field serializes automatically to the client via Colyseus schema patching.

---

## 3. `server/src/rooms/GameRoom.ts` — Role guard + extended broadcast

### 3a. Extend `reaction_phase` broadcast in `_onReactionPhase`

```diff
 this.broadcast("reaction_phase", {
     phase,
     activePlayer,
+    attackerOwnerId: ctx?.attackerOwnerId ?? "",
+    defenderOwnerId: ctx?.defenderOwnerId ?? "",
 });
```

### 3b. Add role guard in `play_reaction_card` handler

Insert after the `index === -1` guard, before the gold check:

```diff
     const card = slot.deck.cards[index];
+
+    if (card.role === "attacker" && client.sessionId !== ctx.attackerOwnerId) return;
+    if (card.role === "defender" && client.sessionId !== ctx.defenderOwnerId) return;
+
     if (slot.gold < card.gold_cost) return;
```

---

## 4. `client/src/components/game/CombatReactionWindow.tsx` — Role-based filtering

### 4a. Track owner IDs and derive `combatRole`

```diff
     const [activePlayer, setActivePlayer] = useState<string>("");
+    const [attackerOwnerId, setAttackerOwnerId] = useState<string>("");
+    const [defenderOwnerId, setDefenderOwnerId] = useState<string>("");
```

```diff
-    useGameRoomMessage<{ phase: string; activePlayer: string }>(
+    useGameRoomMessage<{
+        phase: string;
+        activePlayer: string;
+        attackerOwnerId: string;
+        defenderOwnerId: string;
+    }>(
         "reaction_phase",
-        ({ phase, activePlayer: ap }) => {
+        ({ phase, activePlayer: ap, attackerOwnerId: aId, defenderOwnerId: dId }) => {
             setActivePlayer(phase === "closed" || phase === "" ? "" : ap);
+            setAttackerOwnerId(phase === "closed" ? "" : aId);
+            setDefenderOwnerId(phase === "closed" ? "" : dId);
         },
     );
```

### 4b. Apply role filter to card list

Update the inline card type annotation to include `role` and add the filter:

```diff
     const playerSlots = state?.players as unknown as Record<string, {
         gold: number;
-        deck: { cards: Array<{ name: string; gold_cost: number; is_reaction: boolean }> };
+        deck: { cards: Array<{ name: string; gold_cost: number; is_reaction: boolean; role: string }> };
     }> | undefined;
     const mySlot = playerSlots?.[sessionId];
+
+    const combatRole =
+        sessionId === attackerOwnerId ? "attacker" :
+        sessionId === defenderOwnerId ? "defender" : "";
+
-    const reactionCards = Array.from(mySlot?.deck?.cards ?? []).filter((c) => c.is_reaction);
+    const reactionCards = Array.from(mySlot?.deck?.cards ?? [])
+        .filter((c) => c.is_reaction)
+        .filter((c) => !c.role || c.role === combatRole || combatRole === "");
```

---

## 5. `shared/tests/reactionCardCombat.test.ts` — Role field tests

Add imports and a new `describe` block at the end of the file:

```diff
 import {
     applyReactionEffects,
     CARD_EFFECT_REGISTRY,
     BATTLE_CRY,
     SHIELD_WALL,
+    STARTER_DECK_BLUEPRINTS,
+    CardBlueprint,
 } from "../src/game/cards/reaction-cards";
+import { CardType } from "../src/schemas/Card";
```

```ts
describe("CardBlueprint role field", () => {
    it("BATTLE_CRY has role 'attacker'", () => {
        expect(BATTLE_CRY.role).toBe("attacker");
    });

    it("SHIELD_WALL has role 'defender'", () => {
        expect(SHIELD_WALL.role).toBe("defender");
    });

    it("role filter: attacker sees only Battle Cry", () => {
        const result = STARTER_DECK_BLUEPRINTS.filter(
            (c) => !c.role || c.role === "attacker",
        );
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Battle Cry");
    });

    it("role filter: defender sees only Shield Wall", () => {
        const result = STARTER_DECK_BLUEPRINTS.filter(
            (c) => !c.role || c.role === "defender",
        );
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Shield Wall");
    });

    it("neutral card (no role) is visible to both roles", () => {
        const neutral: CardBlueprint = {
            name: "Neutral Test",
            card_type: CardType.CARD_STATUS_EFFECT,
            gold_cost: 0,
            is_reaction: true,
            effect: {},
        };
        expect([neutral].filter((c) => !c.role || c.role === "attacker")).toHaveLength(1);
        expect([neutral].filter((c) => !c.role || c.role === "defender")).toHaveLength(1);
    });
});
```

---

## Data flow after change

```
reaction window opens
  → server broadcasts reaction_phase { phase, activePlayer, attackerOwnerId, defenderOwnerId }
  → client derives combatRole from sessionId vs owner IDs
  → card list filtered to is_reaction AND (no role OR role === combatRole)
  → attacker sees only "Battle Cry"; defender sees only "Shield Wall"

play_reaction_card { cardName: "Battle Cry" } from defender
  → server: card.role === "attacker" && sessionId !== attackerOwnerId → return (rejected)

play_reaction_card { cardName: "Shield Wall" } from defender
  → server: card.role === "defender" && sessionId === defenderOwnerId → passes role guard
  → continues to gold check, deck splice, FSM PLAY_CARD event
```

---

## Verification

1. `cd shared && yarn test` — all tests pass including the new `CardBlueprint role field` block
2. `yarn tsc --noEmit` — zero type errors across all workspaces
3. Start server + two clients; initiate combat — confirm the defender's reaction modal shows only "Shield Wall"
4. Confirm the attacker's modal (once attacker-ally phase is un-stubbed) shows only "Battle Cry"
5. Send a raw `play_reaction_card` message with `cardName: "Battle Cry"` as the defender via browser devtools — confirm the server rejects it silently (gold unchanged, card remains in deck)
