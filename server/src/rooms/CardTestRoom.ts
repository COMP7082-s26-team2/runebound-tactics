// src/rooms/CardGameRoom.ts
import { Room, OnCreateException } from "colyseus";
import { CardType, GameState, DeckManager } from "@runebound-tactics/shared";

const INITIAL_CARD_LIST = [
    { name: "Attack Boost", card_type: CardType.CARD_STATUS_EFFECT, gold_cost: 2, is_reaction: false },
    { name: "Heal", card_type: CardType.CARD_SPELL_EFFECT, gold_cost: 2, is_reaction: false },
];

export class CardTestRoom extends Room<{state: GameState}> {

    onCreate() {
        this.maxClients = 4; 
        console.log("[Trace 1] onCreate started.");

        const initialState = new GameState();
        console.log("[Trace 2] GameState instantiated.");

        if (!initialState.deck) {
            console.log("[Trace 3] Deck missing. Creating manual DeckManager...");
            initialState.deck = new DeckManager();
        }

        this.setState(initialState);
        console.log("[Trace 4] State attached to room.");

        console.log("[Trace 5] About to call initializeDeck...");
        this.state.deck.initializeDeck(INITIAL_CARD_LIST);
        console.log("[Trace 6] initializeDeck completed.");

        console.log("[Trace 7] About to call shuffle...");
        this.state.deck.shuffle();
        console.log("[Trace 8] shuffle completed.");
   
        console.log("[Trace 9] Registering drawCard message handler...");
        this.onMessage("drawCard", (client) => {
            console.log(`[GameRoom] drawCard executed by: ${client.sessionId}`);
            try {
              const deckContainer = this.state.deck;

              // 1. Boundary Safety Check
              if (!deckContainer.cards || deckContainer.cards.length === 0) {
                console.log("[GameRoom] Action aborted: The card array collection is empty.");
                return;
              }

              // 2. CRITICAL FIX: Target the exact final array index manually
              const targetIndex = deckContainer.cards.length - 1;
              const targetCardInstance = deckContainer.cards[targetIndex];

              if (targetCardInstance) {
                console.log(`[GameRoom] Splicing out card reference target: ${targetCardInstance.name}`);
                
                // 3. Extract the card safely using splice (DO NOT USE POP)
                deckContainer.cards.splice(targetIndex, 1);
                
                // 4. Push it to the discard pile collection if utilizing the true discard pattern
                if (deckContainer.discardPile) {
                    deckContainer.discardPile.push(targetCardInstance);
                }

                // 5. Explicitly signal property modifications to the root state tree
                deckContainer.$changed = true;
                this.state.$changed = true;
                
                console.log(`[GameRoom] Mutation successful. Remainder count: ${deckContainer.cards.length}`);
              }
            } catch (handlerError) {
                console.error("❌ Mutation Error inside handler:", handlerError.message);
            }
        });

        console.log("wat")
    }

    onUncaughtException (err: Error, methodName: string) {
        if (err instanceof OnCreateException) {
          console.log(methodName + " threw ${err.message} : Caused by ${err.message}");
        }
    }
}
