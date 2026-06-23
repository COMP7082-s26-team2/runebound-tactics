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

        this.onMessage("drawCard", (client) => {
            const player = this.state.players.get(client.sessionId);
            
            if (player && player.deck.cards.length > 0) {
                const targetIndex = player.deck.cards.length - 1;
                const targetCard = player.deck.cards.splice(targetIndex, 1)[0];
                
                // If you have a hand array schema configured on the player:
                // player.hand.push(targetCard);
                
                (player.deck as any).$changed = true;
                (this.state as any).$changed = true;
                console.log(`[CardGameRoom] ${client.sessionId} drew card: ${targetCard.name}`);
            } 
        });
    }

    onJoin(client: Client): void{
      console.log(`[CardGameRoom] Player ${client.sessionId} joined. Initializing personal deck.`);
      
      const newPlayer = new GamePlayerSlot();
      newPlayer.sessionId = client.sessionId;
      newPlayer.deck = new DeckManager(); // Pristine, isolated deck instance

      newPlayer.deck.initializeDeck(INITIAL_CARD_LIST);
    
      this.state.players.set(client.sessionId, newPlayer);
      console.log(`[CardGameRoom] Slot ready for ${client.sessionId}. Deck size: ${newPlayer.deck.cards.length}`);
    }

    onUncaughtException (err: Error, methodName: string) {
        if (err instanceof OnCreateException) {
          console.log(methodName + " threw ${err.message} : Caused by ${err.message}");
        }
    }
}
