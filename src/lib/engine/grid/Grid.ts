export type GridCoord = { q: number; r: number };

export interface Grid {
    gridToWorld(coord: GridCoord): { x: number; y: number };

    worldToGrid(x: number, y: number): GridCoord;

    getNeighbors(coord: GridCoord): GridCoord[];

    distance(a: GridCoord, b: GridCoord): number;

    getCellSize(): number;
}