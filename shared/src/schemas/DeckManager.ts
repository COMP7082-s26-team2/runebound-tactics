export class DeckManager extends DeckState {

    /**
     * Initializes the deck using an array of card blueprints.
     * Allows you to easily construct distinct decks or pool piles.
     */
    initializeDeck(blueprints: Array<{ name: string; card_type: CardType; gold_cost: number; is_reaction: boolean }>) {
        this.cards = new ArraySchema<Card>(); // Reset the array securely for Colyseus tracking
        this.discardPile = new ArraySchema<Card>(); // Reset discard pile on new game initialization

        for (const blueprint of blueprints) {
            this.cards.push(
                new Card(
                    blueprint.name,
                    blueprint.card_type,
                    blueprint.gold_cost,
                    blueprint.is_reaction
                )
            );
        }
    }

    /**
     * In-place Fisher-Yates shuffle compatible with Colyseus ArraySchema proxying.
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = this.cards[i];
            this.cards[i] = this.cards[j];
            this.cards[j] = temp;
        }
    }

    /**
     * Pops a card off the top of the deck.
     */
    draw(): Card | undefined {
        return this.cards.pop();
    }

    /**
     * Adds a card directly to the discard pile.
     * Useful when playing a spell, destroying a unit, or discarding from hand.
     */
    discard(card: Card) {
        this.discardPile.push(card);
    }

    /**
     * Takes all cards from the discard pile, moves them back into the main deck,
     * and shuffles them. Perfect for when a player needs to draw but the deck is empty.
     */
    recycleDiscardIntoDeck() {
        if (this.discardPile.length === 0) return;

        // Move all items over to the main card array
        while (this.discardPile.length > 0) {
            const card = this.discardPile.pop();
            if (card) {
                this.cards.push(card);
            }
        }

        // Shuffle the newly replenished deck
        this.shuffle();
    }
}
