import { Vector2D } from "@/lib/engine/core";

export type GridCoord = { q: number; r: number };

export interface Grid {
    gridToWorld(coord: GridCoord): Vector2D;

    worldToGrid(x: number, y: number): GridCoord;

    getNeighbors(coord: GridCoord): GridCoord[];

    distance(a: GridCoord, b: GridCoord): number;

    getCellSize(): number;
}
