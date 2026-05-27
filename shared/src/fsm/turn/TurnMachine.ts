import { Machine } from "../Machine";
import { ActiveState } from "./states/ActiveState";
import { ResolvingState } from "./states/ResolvingState";
import type { TurnContext, TurnEvent } from "./events";

export type TurnMachine = Machine<TurnContext, TurnEvent>;

export function createTurnMachine(initialPlayerId: string): TurnMachine {
    return new Machine<TurnContext, TurnEvent>({
        initial: "active",
        context: { currentPlayerId: initialPlayerId },
        states: [new ActiveState(), new ResolvingState()],
    });
}
