export type TurnFlowPhase =
    | "action-phase"
    | "declare-end-turn"
    | "quick-play"
    | "combat"
    | "post-combat";

export type TurnPhaseState = {
    onEnter?: (prev: TurnFlowPhase | null) => void;
    onUpdate?: (deltaTime: number) => void;
    onExit?: (next: TurnFlowPhase | null) => void;
};

export class TurnFlow {
    
}
