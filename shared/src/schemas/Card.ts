import { Schema, type, ArraySchema } from "@colyseus/schema";

export enum CardType {
  CARD_STATUS_EFFECT = "status",
  CARD_SPELL_EFFECT = "spell"
}

export class Card extends Schema {
    @type("string") name: string;
    @type("string") card_type: CardType;
    @type("number") gold_cost: number;
    @type("boolean") is_reaction: boolean = false;

    constructor(name: string, card_type: CardType, gold_cost: number, is_reaction: boolean) {
        super();
        this.name = name;
        this.card_type = card_type;
        this.gold_cost = gold_cost;
        this.is_reaction = is_reaction;
    }
}

export class DeckState extends Schema {
    @type([ Card ]) cards = new ArraySchema<Card>();
    @type([ Card ]) discardPile = new ArraySchema<Card=>();
}
