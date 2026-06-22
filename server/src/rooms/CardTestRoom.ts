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
        });
        console.log("[Trace 10] drawCard handler successfully registered.");
    }

    onUncaughtException (err: Error, methodName: string) {
        if (err instanceof OnCreateException) {
          console.log(methodName + " threw ${err.message} : Caused by ${err.message}");
        }
    }
}
