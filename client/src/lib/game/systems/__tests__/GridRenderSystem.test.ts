import { GridRenderSystem } from "../GridRenderSystem";
import type { TerrainLayer } from "@/lib/game/tilemap";
import type { DrawOp } from "@/lib/autotile-core";

// Module-level mock for drawTile so we can assert call count + arguments
// without rendering anything. `drawTile` is the only autotile-core symbol
// GridRenderSystem imports from the canvas adapter.
jest.mock("@/lib/autotile-core/canvas", () => {
    const actual = jest.requireActual("@/lib/autotile-core/canvas");
    return { ...actual, drawTile: jest.fn() };
});

import { drawTile } from "@/lib/autotile-core/canvas";
const mockedDrawTile = drawTile as jest.MockedFunction<typeof drawTile>;

function makeFakeLayer(rowsByCell: Record<string, readonly DrawOp[]>): TerrainLayer {
    // Treat the keys as "r,c" -> ops; rows/cols inferred from key range.
    const keys = Object.keys(rowsByCell);
    const maxR = Math.max(0, ...keys.map((k) => Number(k.split(",")[0])));
    const maxC = Math.max(0, ...keys.map((k) => Number(k.split(",")[1])));
    return {
        rows: maxR + 1,
        cols: maxC + 1,
        ops(r: number, c: number): readonly DrawOp[] {
            return rowsByCell[`${r},${c}`] ?? [];
        },
    } as unknown as TerrainLayer;
}

function makeMockCtx(): CanvasRenderingContext2D {
    return {} as unknown as CanvasRenderingContext2D;
}

describe("GridRenderSystem.draw", () => {
    beforeEach(() => {
        mockedDrawTile.mockClear();
    });

    it("calls drawTile once per DrawOp across the terrain grid", () => {
        const layer = makeFakeLayer({
            "0,0": [{ tileId: 1 }],
            "0,1": [{ tileId: 1 }, { tileId: 99, clip: "half-left" }],
            "1,0": [{ tileId: 2 }],
            "1,1": [],
        });
        const sheet = {} as HTMLImageElement;
        const sys = new GridRenderSystem(layer, sheet, 80);

        sys.draw(makeMockCtx());

        // 1 + 2 + 1 + 0 = 4 ops total → 4 drawTile calls.
        expect(mockedDrawTile).toHaveBeenCalledTimes(4);
    });

    it("passes the correct (r, c, clip) to drawTile for an overlay op", () => {
        const layer = makeFakeLayer({
            "3,5": [{ tileId: 99, clip: "half-left" }],
        });
        const sheet = {} as HTMLImageElement;
        const sys = new GridRenderSystem(layer, sheet, 80);

        sys.draw(makeMockCtx());

        expect(mockedDrawTile).toHaveBeenCalledTimes(1);
        // drawTile signature: (ctx, sheet, tileId, r, c, clip, opts)
        const call = mockedDrawTile.mock.calls[0];
        expect(call[2]).toBe(99);             // tileId
        expect(call[3]).toBe(3);              // r
        expect(call[4]).toBe(5);              // c
        expect(call[5]).toBe("half-left");    // clip
        expect(call[6]).toEqual({
            cellSize: 80,
            spriteCellSize: 16,
            spriteCols: 16,
        });
    });
});
