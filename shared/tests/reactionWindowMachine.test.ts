import { createReactionWindowMachine } from "../src/fsm/reaction/ReactionWindowMachine";

describe("reactionWindowMachine", () => {
    const make = () =>
        createReactionWindowMachine("attacker-session", "defender-session");

    it("starts in defender with correct context", () => {
        const m = make();
        expect(m.state).toBe("defender");
        expect(m.context.attackerOwnerId).toBe("attacker-session");
        expect(m.context.defenderOwnerId).toBe("defender-session");
        expect(m.context.cardsPlayed).toEqual([]);
    });

    it("REACTION_PASS advances full pipeline: defender → closed", () => {
        const m = make();
        m.send("REACTION_PASS");
        expect(m.state).toBe("defender-ally");
        m.send("REACTION_PASS");
        expect(m.state).toBe("attacker-ally");
        m.send("REACTION_PASS");
        expect(m.state).toBe("resolve");
        m.send("REACTION_PASS");
        expect(m.state).toBe("closed");
    });

    it("REACTION_TIMEOUT follows same transitions as REACTION_PASS from each state", () => {
        const m = make();
        m.send("REACTION_TIMEOUT");
        expect(m.state).toBe("defender-ally");
        m.send("REACTION_TIMEOUT");
        expect(m.state).toBe("attacker-ally");
        m.send("REACTION_TIMEOUT");
        expect(m.state).toBe("resolve");
        m.send("REACTION_TIMEOUT");
        expect(m.state).toBe("closed");
    });

    it("PLAY_CARD self-loops in defender and appends to cardsPlayed", () => {
        const m = make();
        m.send("PLAY_CARD", { playerId: "defender-session", cardId: "shield_bash" });
        expect(m.state).toBe("defender");
        expect(m.context.cardsPlayed).toEqual([
            { playerId: "defender-session", cardId: "shield_bash" },
        ]);
    });

    it("PLAY_CARD self-loops in defender-ally and attacker-ally", () => {
        const m = make();
        m.send("REACTION_PASS");
        m.send("PLAY_CARD", { playerId: "defender-session", cardId: "ally_shield" });
        expect(m.state).toBe("defender-ally");
        m.send("REACTION_PASS");
        m.send("PLAY_CARD", { playerId: "attacker-session", cardId: "rally" });
        expect(m.state).toBe("attacker-ally");
        expect(m.context.cardsPlayed).toHaveLength(2);
    });

    it("PLAY_CARD is ignored in resolve", () => {
        const m = make();
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        expect(m.state).toBe("resolve");
        m.send("PLAY_CARD", { playerId: "defender-session", cardId: "last_stand" });
        expect(m.state).toBe("resolve");
        expect(m.context.cardsPlayed).toHaveLength(0);
    });

    it("all events are ignored in closed (terminal state)", () => {
        const m = make();
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        expect(m.state).toBe("closed");
        m.send("REACTION_PASS");
        m.send("REACTION_TIMEOUT");
        m.send("PLAY_CARD", { playerId: "p1", cardId: "c1" });
        expect(m.state).toBe("closed");
    });

    it("subscriber notified for each transition (full pipeline trace)", () => {
        const m = make();
        const states: string[] = [];
        m.subscribe((state) => states.push(state));
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        expect(states).toEqual([
            "defender",
            "defender-ally",
            "attacker-ally",
            "resolve",
            "closed",
        ]);
    });

    it("context attackerOwnerId and defenderOwnerId preserved throughout", () => {
        const m = make();
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        m.send("REACTION_PASS");
        expect(m.context.attackerOwnerId).toBe("attacker-session");
        expect(m.context.defenderOwnerId).toBe("defender-session");
    });

    it("multiple PLAY_CARD entries accumulate in cardsPlayed across states", () => {
        const m = make();
        m.send("PLAY_CARD", { playerId: "defender-session", cardId: "card_a" });
        m.send("REACTION_PASS");
        m.send("PLAY_CARD", { playerId: "defender-session", cardId: "card_b" });
        m.send("REACTION_PASS");
        m.send("PLAY_CARD", { playerId: "attacker-session", cardId: "card_c" });
        expect(m.context.cardsPlayed).toEqual([
            { playerId: "defender-session", cardId: "card_a" },
            { playerId: "defender-session", cardId: "card_b" },
            { playerId: "attacker-session", cardId: "card_c" },
        ]);
    });
});
