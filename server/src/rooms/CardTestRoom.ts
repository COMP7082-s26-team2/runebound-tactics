// src/rooms/CardGameRoom.ts
import { Room, Client } from "colyseus";
import { CardType, Card, GameState, DeckManager, DeckState } from "@runebound-tactics/shared";

// A sample layout of card blueprints to pass into the constructor
const INITIAL_CARD_LIST = [
    { name: "Attack Boost", card_type: CardType.CARD_STATUS_EFFECT, gold_cost: 2, is_reaction: false },
    { name: "Heal", card_type: CardType.CARD_SPELL_EFFECT, gold_cost: 2, is_reaction: false },
];

export class CardTestRoom extends Room<GameState> {
    maxClients = 4;

    onCreate(options: any) {
        // 1. Create and bind the root state
        const initialState = new GameState();

if (!initialState.deck) {
        console.log("[GameRoom] Deck property missing on schema instance. Initializing manually...");
        initialState.deck = new DeckManager();
    }

        this.setState(initialState);

        console.log("[GameRoom] State initialized.");

        // 2. Initialize the card instances inside the deck manager
        this.state.deck.initializeDeck(INITIAL_CARD_LIST);
        console.log(`[GameRoom] Deck loaded with ${this.state.deck.cards.length} cards.`);

        // 3. Shuffle the deck immediately so it's ready for gameplay
        this.state.deck.shuffle();
        console.log("[GameRoom] Deck randomized.");

        // 4. Register incoming message handlers (e.g., player drawing a card)
        this.onMessage("drawCard", (client) => {
            // Check if deck is dry, recycle discard pile if needed
            if (this.state.deck.cards.length === 0) {
                this.state.deck.recycleDiscardIntoDeck();
            }

            const drawnCard = this.state.deck.draw();
            if (drawnCard) {
                console.log(`[GameRoom] ${client.sessionId} drew: ${drawnCard.name}`);
                // Handle pushing drawnCard to the respective player's hand array schema here
            }
        });
    }

}
