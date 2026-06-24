import { Machine } from "../Machine";
import { DefenderState } from "./states/DefenderState";
import { DefenderAllyState } from "./states/DefenderAllyState";
import { AttackerAllyState } from "./states/AttackerAllyState";
import { ResolveState } from "./states/ResolveState";
import { ClosedState } from "./states/ClosedState";
import type { ReactionWindowContext, ReactionWindowEvent } from "./events";

export type ReactionWindowMachine = Machine<ReactionWindowContext, ReactionWindowEvent>;

export function createReactionWindowMachine(
    attackerOwnerId: string,
    defenderOwnerId: string,
): ReactionWindowMachine {
    return new Machine<ReactionWindowContext, ReactionWindowEvent>({
        initial: "defender",
        context: { attackerOwnerId, defenderOwnerId, cardsPlayed: [] },
        states: [
            new DefenderState(),
            new DefenderAllyState(),
            new AttackerAllyState(),
            new ResolveState(),
            new ClosedState(),
        ],
    });
}
