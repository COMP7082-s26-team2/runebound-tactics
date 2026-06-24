// src/rooms/CardGameRoom.ts
// This file is used in the feature testing under test-integration/test-cards.ts
// Use this file as guidance to integrate into the GameRoom
import { Room, Client, OnCreateException } from "colyseus";
import { CardType, GameState, GamePlayerSlot, DeckManager } from "@runebound-tactics/shared";

// Hard coded card deck seeding
const INITIAL_CARD_LIST = [
    { name: "Attack Boost", card_type: CardType.CARD_STATUS_EFFECT, gold_cost: 2, is_reaction: false },
    { name: "Heal", card_type: CardType.CARD_SPELL_EFFECT, gold_cost: 2, is_reaction: false },
];

/** 
 *  Test Class to validate the Card Data definition and parsing
 *  functionality.
 */
export class CardTestRoom extends Room<{state: GameState}> {
    onCreate() {
        this.maxClients = 4; 
        const initialState = new GameState();
        this.setState(initialState);


        // INTEGRATE: Include this listener for the GameRoom Logic
        // Expects the position of card in the message as an integer
        this.onMessage("drawAndPlay", (client, message) => {
            // Extract the requested position index from the client message then validate it.
            console.log(message);
            
            const { position } = message;
            const playerSlot = this.state.players.get(client.sessionId);

            if (!playerSlot || playerSlot.isEliminated ) return;

            const deckContainer = playerSlot.deck;

            if (!deckContainer.cards || deckContainer.cards.length === 0) {
                console.log(`[GameRoom] ${client.sessionId} failed to draw: Deck is empty.`);
                return;
            }
            
            if (typeof position !== "number" || position < 0 || position >= deckContainer.cards.length) {
                console.warn(`[GameRoom] ${client.sessionId} requested invalid position: ${position}`);
                client.send("error", { message: "Invalid card selection position!" });
                return;
            }

            const targetCard = deckContainer.cards[position];
            
            // Check Card Cost against Player total gold
            if (playerSlot.gold < targetCard.gold_cost) {
                console.log(`[GameRoom] DrawAndPlay rejected: ${client.sessionId} needs ${targetCard.gold_cost} gold but only has ${playerSlot.gold}.`);
                client.send("error", { message: `Insufficient gold to execute ${targetCard.name}!` });
                return;
            }
        
            // Deduct resource and splice the card out of the deck
            playerSlot.gold -= targetCard.gold_cost;
            deckContainer.cards.splice(position, 1);
            console.log(`[GameRoom] SUCCESS! ${client.sessionId} drew card at position [${position}]: ${targetCard.name}`);
        });
    }

    // INTEGRATE: Instantiate the Card Deck when the player joins.
    onJoin(client: Client, options: any ): void{
      console.log(`[CardGameRoom] Player ${client.sessionId} joined. Initializing personal deck.`);
      
      const newPlayer = new GamePlayerSlot();
      newPlayer.sessionId = client.sessionId;
      newPlayer.deck = new DeckManager();

      // DEBUG PURPOSES
      newPlayer.gold = typeof options.gold == "number" ? options.gold : 0;

      // SEED THE DECK: Either from Database...or Hardcode it for now using array defined above.
      newPlayer.deck.initializeDeck(INITIAL_CARD_LIST);
    
      this.state.players.set(client.sessionId, newPlayer);
      console.log(`[CardGameRoom] Slot ready for ${client.sessionId}. Deck size: ${newPlayer.deck.cards.length}`);
    }

    onUncaughtException (err: Error, methodName: string) {
        if (err instanceof OnCreateException) {
          console.log(methodName + `threw ${err.message} : Caused by ${err.message}`);
        }
    }
}
