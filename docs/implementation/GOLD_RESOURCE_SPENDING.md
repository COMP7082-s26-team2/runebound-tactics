# Implementation Plan: Card Resource and Gold Spending Refinement

The card system already validates and deducts gold on play (`GameRoom.ts:231-233`), but players are never granted any gold — `GamePlayerSlot.gold` defaults to `0` and nothing writes to it during a real match. The post-combat phase has a logged stub ("gold distribution pending") that immediately auto-resolves. This plan closes both gaps: gold income (flat per turn + kill reward) and a paid card in the starter deck to make the end-to-end spending path testable.

---

## Files

| File | Status | Change |
|---|---|---|
| `server/src/rooms/GameRoom.ts` | Modify | Starting gold in `_startGame()`, turn-start income in `_performTurnAdvance()`, kill reward in `_onTurnPhase("post-combat")`, `_pendingKillAttackerOwner` field |
| `shared/src/game/cards/reaction-cards.ts` | Modify | Add `IRON_WILL` card (`gold_cost: 2`) to blueprints and effect registry |

---

## 1. Constants — `server/src/rooms/GameRoom.ts`

Add near the existing AP constants at the top of the file:

```ts
const STARTING_GOLD = 5;
const GOLD_INCOME_PER_TURN = 3;
const GOLD_KILL_REWARD = 2;
```

---

## 2. Starting gold — `_startGame()`

After `_spawnInitialUnits()`, before deck seeding:

```ts
for (const slot of this.state.players.values()) {
    slot.gold = STARTING_GOLD;
    console.log(`[${new Date().toISOString()}] [GameRoom] gold: ${slot.sessionId} starting gold → ${slot.gold}`);
}
```

---

## 3. Turn-start income — `_performTurnAdvance()`

At the end of the method, after `currentTurnId` has been advanced:

```ts
const incomingSlot = this.state.players.get(this.state.currentTurnId);
if (incomingSlot) {
    incomingSlot.gold += GOLD_INCOME_PER_TURN;
    console.log(`[${new Date().toISOString()}] [GameRoom] gold: ${this.state.currentTurnId} income +${GOLD_INCOME_PER_TURN} → ${incomingSlot.gold}`);
}
```

---

## 4. Kill reward — `_onTurnPhase("post-combat")`

The attacker's `ownerId` must be captured before `_resolvePendingAttack()` nulls `_pendingAttack`. Add a class field:

```ts
private _pendingKillAttackerOwner: string | null = null;
```

In the `"combat"` case, capture the attacker owner and whether the attack was a kill before resolving:

```ts
case "combat":
    this._pendingKillAttackerOwner =
        this._pendingAttack?.defenderDied
            ? (this.state.units.get(this._pendingAttack.attackerId)?.ownerId ?? null)
            : null;
    this._resolvePendingAttack();
    if (this.state.phase !== "ended") {
        this._turnMachine.send("COMBAT_RESOLVED");
    }
    break;
```

Replace the stub in `"post-combat"`:

```ts
case "post-combat": {
    const attackerOwner = this._pendingKillAttackerOwner;
    this._pendingKillAttackerOwner = null;
    if (attackerOwner) {
        const slot = this.state.players.get(attackerOwner);
        if (slot) {
            slot.gold += GOLD_KILL_REWARD;
            console.log(`[${new Date().toISOString()}] [GameRoom] gold: ${attackerOwner} kill reward +${GOLD_KILL_REWARD} → ${slot.gold}`);
        }
    }
    this._turnMachine.send("POST_COMBAT_RESOLVED");
    break;
}
```

---

## 5. New paid card — `shared/src/game/cards/reaction-cards.ts`

Add `IRON_WILL` alongside the existing cards:

```ts
export const IRON_WILL: CardBlueprint = {
    name: "Iron Will",
    card_type: CardType.CARD_STATUS_EFFECT,
    gold_cost: 2,
    is_reaction: true,
    effect: { defenseBonus: 4 },
};
```

Add to `STARTER_DECK_BLUEPRINTS`:

```ts
export const STARTER_DECK_BLUEPRINTS: CardBlueprint[] = [
    BATTLE_CRY,
    SHIELD_WALL,
    IRON_WILL,
];
```

Add to `CARD_EFFECT_REGISTRY`:

```ts
[IRON_WILL.name, IRON_WILL.effect],
```

---

## Verification

1. `yarn workspace @runebound-tactics/server tsc --noEmit` — zero type errors
2. `yarn workspace @runebound-tactics/shared tsc --noEmit` — zero type errors
3. Start server + two clients. Confirm each player's gold starts at `5` in the reaction modal header.
4. End a turn — confirm the incoming player's gold increases by `3` on their next reaction window.
5. Attack and kill an enemy unit — confirm the attacker's gold increases by `2` (server log: `kill reward +2`).
6. With `5` starting gold, trigger a reaction window and play "Iron Will" (cost 2) — confirm gold drops 5 → 3, card is removed from deck, server logs `reaction-effects: defenseBonus=4`.
7. Spend down to `0` gold — confirm "Iron Will" button is disabled in the modal and a crafted `play_reaction_card` message is rejected server-side.
