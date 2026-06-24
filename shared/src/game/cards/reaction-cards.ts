import { CardType } from "../../schemas/Card";
import { computeAttackDamage } from "../units/unit-stats";

export interface CardEffect {
    attackBonus?: number;
    defenseBonus?: number;
}

export interface CardBlueprint {
    name: string;
    card_type: CardType;
    gold_cost: number;
    is_reaction: boolean;
    effect: CardEffect;
}

export const BATTLE_CRY: CardBlueprint = {
    name: "Battle Cry",
    card_type: CardType.CARD_STATUS_EFFECT,
    gold_cost: 0,
    is_reaction: true,
    effect: { attackBonus: 2 },
};

export const SHIELD_WALL: CardBlueprint = {
    name: "Shield Wall",
    card_type: CardType.CARD_STATUS_EFFECT,
    gold_cost: 0,
    is_reaction: true,
    effect: { defenseBonus: 2 },
};

export const STARTER_DECK_BLUEPRINTS: CardBlueprint[] = [
    BATTLE_CRY,
    SHIELD_WALL,
];

export const CARD_EFFECT_REGISTRY = new Map<string, CardEffect>([
    [BATTLE_CRY.name, BATTLE_CRY.effect],
    [SHIELD_WALL.name, SHIELD_WALL.effect],
]);

/**
 * Pure helper — apply all reaction card effects to a pending combat exchange.
 * Does not mutate schema objects. GameRoom calls this just before resolving
 * the pending attack; tests call it directly.
 *
 * `cardsPlayed[].cardId` holds the card name (used as the stable lookup key
 * in CARD_EFFECT_REGISTRY — the Card schema has no separate id field).
 */
export function applyReactionEffects(
    cardsPlayed: Array<{ playerId: string; cardId: string }>,
    attackerOwnerId: string,
    defenderOwnerId: string,
    attacker: { baseAttackDamage: number; bonusAttackDamage: number; damageType: string },
    defender: { baseDefense: number; bonusDefense: number; weakness: readonly string[] },
): { damage: number; attackBonus: number; defenseBonus: number } {
    let attackBonus = 0;
    let defenseBonus = 0;

    for (const entry of cardsPlayed) {
        const effect = CARD_EFFECT_REGISTRY.get(entry.cardId);
        if (!effect) continue;
        if (entry.playerId === attackerOwnerId) {
            attackBonus += effect.attackBonus ?? 0;
        } else if (entry.playerId === defenderOwnerId) {
            defenseBonus += effect.defenseBonus ?? 0;
        }
    }

    const effectiveAttacker = {
        baseAttackDamage: attacker.baseAttackDamage,
        bonusAttackDamage: attacker.bonusAttackDamage + attackBonus,
        damageType: attacker.damageType,
    };
    const effectiveDefender = {
        baseDefense: defender.baseDefense,
        bonusDefense: defender.bonusDefense + defenseBonus,
        weakness: defender.weakness,
    };

    const damage = computeAttackDamage(effectiveAttacker, effectiveDefender);
    return { damage, attackBonus, defenseBonus };
}
