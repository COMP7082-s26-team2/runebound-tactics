import { Machine } from "../Machine";
import { ActionPhaseState } from "./states/ActionPhaseState";
import { DeclareEndTurnState } from "./states/DeclareEndTurnState";
import { QuickPlayState } from "./states/QuickPlayState";
import { CombatState } from "./states/CombatState";
import { PostCombatState } from "./states/PostCombatState";
import type { TurnContext, TurnEvent } from "./events";

export type TurnMachine = Machine<TurnContext, TurnEvent>;

export function createTurnMachine(initialPlayerId: string): TurnMachine {
    return new Machine<TurnContext, TurnEvent>({
        initial: "action-phase",
        context: { currentPlayerId: initialPlayerId },
        states: [
            new ActionPhaseState(),
            new DeclareEndTurnState(),
            new QuickPlayState(),
            new CombatState(),
            new PostCombatState(),
        ],
    });
}
