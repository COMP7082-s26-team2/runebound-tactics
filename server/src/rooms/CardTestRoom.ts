// src/rooms/CardGameRoom.ts
import { Room, Client, OnCreateException } from "colyseus";
import { CardType, GameState, GamePlayerSlot, DeckManager } from "@runebound-tactics/shared";

const INITIAL_CARD_LIST = [
    { name: "Attack Boost", card_type: CardType.CARD_STATUS_EFFECT, gold_cost: 2, is_reaction: false },
    { name: "Heal", card_type: CardType.CARD_SPELL_EFFECT, gold_cost: 2, is_reaction: false },
];

export class CardTestRoom extends Room<{state: GameState}> {

    onCreate() {
        this.maxClients = 4; 
        const initialState = new GameState();
        this.setState(initialState);

        this.onMessage("drawAndPlay", (client) => {
            const playerSlot = this.state.players.get(client.sessionId);


            if (!playerSlot || playerSlot.isEliminated ) return;

            const deckContainer = playerSlot.deck;

            if (!deckContainer.cards || deckContainer.cards.length === 0) {
                console.log(`[GameRoom] ${client.sessionId} failed to draw: Deck is empty.`);
                return;
            }
        
            // 2. STAGE 1: Draw the top card (using safe index splicing)
            const targetIndex = deckContainer.cards.length - 1;
            const targetCard = deckContainer.cards[targetIndex];
        
            if (!targetCard) return;
        
            // 3. STAGE 2: Enforce Gold Rules
            if (playerSlot.gold < targetCard.gold_cost) {
                console.log(`[GameRoom] DrawAndPlay rejected: ${client.sessionId} needs ${targetCard.gold_cost} gold but only has ${playerSlot.gold}.`);
                client.send("error", { message: `Insufficient gold to execute ${targetCard.name}!` });
                return;
            }
        
            // 4. MUTATION: Deduct resource and splice the card out of the deck
            playerSlot.gold -= targetCard.gold_cost;
            deckContainer.cards.splice(targetIndex, 1);
        
            console.log(`[GameRoom] SUCCESS! ${client.sessionId} drew and instantly cast ${targetCard.name}. Remaining Gold: ${playerSlot.gold}`);
        
            console.log(`[CardGameRoom] ${client.sessionId} drew card: ${targetCard.name}`);
        });
    }

    onJoin(client: Client, options: any ): void{
      console.log(`[CardGameRoom] Player ${client.sessionId} joined. Initializing personal deck.`);
      
      const newPlayer = new GamePlayerSlot();
      newPlayer.sessionId = client.sessionId;
      newPlayer.deck = new DeckManager(); // Pristine, isolated deck instance
      newPlayer.displayName = typeof options.dis

      // DEBUG PURPOSES
      newPlayer.gold = typeof options.gold == "number" ? options.gold : 0;

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
