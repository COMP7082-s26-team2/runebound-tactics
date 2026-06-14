export class DeckManager extends DeckState {

    /**
     * Initializes the deck using an array of card blueprints.
     * Allows you to easily construct distinct decks or pool piles.
     */
    initializeDeck(blueprints: Array<{ name: string; card_type: CardType; gold_cost: number; is_reaction: boolean }>) {
        this.cards = new ArraySchema<Card>(); // Reset the array securely for Colyseus tracking

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
}
