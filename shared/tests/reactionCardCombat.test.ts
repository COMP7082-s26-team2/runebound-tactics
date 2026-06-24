import {
    applyReactionEffects,
    CARD_EFFECT_REGISTRY,
    BATTLE_CRY,
    SHIELD_WALL,
} from "../src/game/cards/reaction-cards";
import { computeAttackDamage } from "../src/game/units/unit-stats";
import { createReactionWindowMachine } from "../src/fsm/reaction/ReactionWindowMachine";

const attacker = { baseAttackDamage: 5, bonusAttackDamage: 0, damageType: "melee" };
const defender = { baseDefense: 2, bonusDefense: 0, weakness: [] as string[] };
const baseline = computeAttackDamage(attacker, defender); // max(1, 5 - 2) = 3

describe("CARD_EFFECT_REGISTRY", () => {
    it("contains Battle Cry with attackBonus: 2", () => {
        expect(CARD_EFFECT_REGISTRY.get(BATTLE_CRY.name)).toEqual({ attackBonus: 2 });
    });

    it("contains Shield Wall with defenseBonus: 2", () => {
        expect(CARD_EFFECT_REGISTRY.get(SHIELD_WALL.name)).toEqual({ defenseBonus: 2 });
    });
});

describe("applyReactionEffects", () => {
    it("returns unmodified damage when cardsPlayed is empty", () => {
        const { damage, attackBonus, defenseBonus } = applyReactionEffects(
            [], "attacker", "defender", attacker, defender,
        );
        expect(damage).toBe(baseline);
        expect(attackBonus).toBe(0);
        expect(defenseBonus).toBe(0);
    });

    it("Battle Cry played by attacker increases damage by 2", () => {
        const { damage, attackBonus } = applyReactionEffects(
            [{ playerId: "attacker", cardId: BATTLE_CRY.name }],
            "attacker", "defender", attacker, defender,
        );
        expect(attackBonus).toBe(2);
        expect(damage).toBe(baseline + 2);
    });

    it("Shield Wall played by defender decreases damage (minimum 1 guaranteed)", () => {
        const { damage, defenseBonus } = applyReactionEffects(
            [{ playerId: "defender", cardId: SHIELD_WALL.name }],
            "attacker", "defender", attacker, defender,
        );
        expect(defenseBonus).toBe(2);
        expect(damage).toBe(Math.max(1, baseline - 2));
    });

    it("Battle Cry and Shield Wall together net out to baseline", () => {
        const cards = [
            { playerId: "attacker", cardId: BATTLE_CRY.name },
            { playerId: "defender", cardId: SHIELD_WALL.name },
        ];
        const { damage } = applyReactionEffects(cards, "attacker", "defender", attacker, defender);
        // +2 attack, +2 defense → same net as unmodified
        expect(damage).toBe(baseline);
    });

    it("Battle Cry played by the defender side has no effect", () => {
        const { damage, attackBonus } = applyReactionEffects(
            [{ playerId: "defender", cardId: BATTLE_CRY.name }],
            "attacker", "defender", attacker, defender,
        );
        expect(attackBonus).toBe(0);
        expect(damage).toBe(baseline);
    });

    it("unknown card name is silently ignored", () => {
        const { damage } = applyReactionEffects(
            [{ playerId: "attacker", cardId: "nonexistent_card" }],
            "attacker", "defender", attacker, defender,
        );
        expect(damage).toBe(baseline);
    });

    it("damage is always at least 1 even when defenseBonus fully absorbs attack", () => {
        const weakAttacker = { baseAttackDamage: 2, bonusAttackDamage: 0, damageType: "melee" };
        const strongDefender = { baseDefense: 5, bonusDefense: 0, weakness: [] as string[] };
        const { damage } = applyReactionEffects(
            [{ playerId: "defender", cardId: SHIELD_WALL.name }],
            "attacker", "defender", weakAttacker, strongDefender,
        );
        expect(damage).toBeGreaterThanOrEqual(1);
    });
});

describe("full FSM sequence with card play", () => {
    it("PLAY_CARD accumulates in cardsPlayed; machine reaches closed", () => {
        const m = createReactionWindowMachine("attacker-session", "defender-session");

        m.send("PLAY_CARD", { playerId: "defender-session", cardId: SHIELD_WALL.name });
        expect(m.state).toBe("defender");
        expect(m.context.cardsPlayed).toEqual([
            { playerId: "defender-session", cardId: SHIELD_WALL.name },
        ]);

        m.send("REACTION_PASS"); // defender → defender-ally
        m.send("REACTION_PASS"); // defender-ally → attacker-ally
        m.send("REACTION_PASS"); // attacker-ally → resolve
        m.send("REACTION_PASS"); // resolve → closed

        expect(m.state).toBe("closed");
        expect(m.context.cardsPlayed).toHaveLength(1);
        expect(m.context.cardsPlayed[0].cardId).toBe(SHIELD_WALL.name);
    });

    it("applyReactionEffects using FSM cardsPlayed produces modified damage", () => {
        const m = createReactionWindowMachine("attacker-session", "defender-session");
        m.send("PLAY_CARD", { playerId: "defender-session", cardId: SHIELD_WALL.name });
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");

        const { damage } = applyReactionEffects(
            m.context.cardsPlayed,
            m.context.attackerOwnerId,
            m.context.defenderOwnerId,
            attacker,
            defender,
        );
        expect(damage).toBe(Math.max(1, baseline - 2));
    });
});
