// New primitives — class-per-state FSM
export { StateBase } from "./StateBase";
export type { TransitionResult, StateAction } from "./StateBase";
export { Machine } from "./Machine";
export type { MachineConfig, MachineListener } from "./Machine";

// Selection machine
export { createSelectionMachine } from "./selection/SelectionMachine";
export type { SelectionMachine } from "./selection/SelectionMachine";
export type {
    SelectionState,
    SelectionEvent,
    SelectionContext,
    SelectFriendlyPayload,
    MoveRequestedPayload,
} from "./selection/events";

// Turn machine
export { createTurnMachine } from "./turn/TurnMachine";
export type { TurnMachine } from "./turn/TurnMachine";
export type {
    TurnState,
    TurnEvent,
    TurnContext,
    TurnAdvancedPayload,
} from "./turn/events";

// Deprecated — legacy config-object primitive. Kept for back-compat during
// migration; removed in a follow-up sprint once no consumers remain.
// @deprecated Use `Machine` + `StateBase` from this module instead.
export { StateMachine } from "./fsm";
export type {
    MachineConfig as LegacyMachineConfig,
    StateConfig,
    StateMachineListener,
} from "./fsm";
