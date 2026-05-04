export interface GameComponent {
    init?(): void;

    update?(dt: number): void;

    draw?(ctx: CanvasRenderingContext2D, alpha: number): void;

    preDraw?(ctx: CanvasRenderingContext2D, alpha: number): void;

    postDraw?(ctx: CanvasRenderingContext2D, alpha: number): void;

    destroy?(): void;

    zIndex?: number; // optional rendering order
}
