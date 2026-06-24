import type { ClipRegion, DrawOp, OverlaySet, OverlayTerrain, ResolveOpts } from './types';
import { SUBTRACTIONS, clipMinusTriangle } from './clip-paths';
import { resolveCellOps } from './resolver';

export interface DrawTileOpts {
  readonly cellSize: number;          // canvas-space tile side (e.g. 32)
  readonly spriteCellSize: number;    // source sprite tile side (e.g. 16)
  readonly spriteCols: number;        // sheet columns (e.g. 16)
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  tileId: number,
  r: number,
  c: number,
  clip: ClipRegion | undefined,
  opts: DrawTileOpts,
): void {
  const t = opts.cellSize, h = t / 2;
  const sCol = tileId % opts.spriteCols;
  const sRow = Math.floor(tileId / opts.spriteCols);
  const x = c * t, y = r * t;
  const restore = clip != null;
  if (restore) {
    ctx.save();
    if (clip === 'half-left' || clip === 'half-right' || clip === 'half-top' || clip === 'half-bottom'
      || clip === 'quad-tl' || clip === 'quad-tr' || clip === 'quad-bl' || clip === 'quad-br') {
      ctx.beginPath();
      if (clip === 'half-left')   ctx.rect(x,     y,     h, t);
      if (clip === 'half-right')  ctx.rect(x + h, y,     h, t);
      if (clip === 'half-top')    ctx.rect(x,     y,     t, h);
      if (clip === 'half-bottom') ctx.rect(x,     y + h, t, h);
      if (clip === 'quad-tl')     ctx.rect(x,     y,     h, h);
      if (clip === 'quad-tr')     ctx.rect(x + h, y,     h, h);
      if (clip === 'quad-bl')     ctx.rect(x,     y + h, h, h);
      if (clip === 'quad-br')     ctx.rect(x + h, y + h, h, h);
      ctx.clip();
    } else {
      const tris = SUBTRACTIONS.get(clip);
      if (tris) for (const tri of tris) clipMinusTriangle(ctx, tri, x, y, t);
    }
  }
  ctx.drawImage(
    sheet,
    sCol * opts.spriteCellSize, sRow * opts.spriteCellSize,
    opts.spriteCellSize, opts.spriteCellSize,
    x, y, t, t,
  );
  if (restore) ctx.restore();
}

export type GridMode = 'none' | 'single' | 'dual' | 'both';

export interface RenderToCanvasOpts {
  cellSize?: number;          // default 32
  spriteCellSize?: number;    // default 16
  spriteCols?: number;        // default 16
  skipIntrusion?: ResolveOpts['skipIntrusion'];
  hover?: { r: number; c: number } | null;
  gridMode?: GridMode;
}

export function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  world: ReadonlyArray<ReadonlyArray<string | null>>,
  sets: readonly OverlaySet[],
  terrains: readonly OverlayTerrain[],
  opts: RenderToCanvasOpts = {},
): void {
  const cellSize = opts.cellSize ?? 32;
  const spriteCellSize = opts.spriteCellSize ?? 16;
  const spriteCols = opts.spriteCols ?? 16;
  const drawOpts: DrawTileOpts = { cellSize, spriteCellSize, spriteCols };
  ctx.imageSmoothingEnabled = false;

  const rows = world.length;
  const cols = rows > 0 ? world[0]!.length : 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ops = resolveCellOps(
        world, r, c, sets, terrains,
        opts.skipIntrusion !== undefined ? { skipIntrusion: opts.skipIntrusion } : {},
      );
      if (ops.length === 0) {
        ctx.fillStyle = '#000';
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        continue;
      }
      for (const op of ops) drawTile(ctx, sheet, op.tileId, r, c, op.clip, drawOpts);
    }
  }

  if (opts.gridMode && opts.gridMode !== 'none') drawGrid(ctx, opts.gridMode, cols, rows, cellSize);
  if (opts.hover) drawHover(ctx, opts.hover.r, opts.hover.c, cellSize);
}

function drawGrid(ctx: CanvasRenderingContext2D, mode: GridMode, cols: number, rows: number, t: number): void {
  // Port from canvas-painter/src/canvas-renderer.ts drawGrid(). Same dashed-dual + solid-single.
  const w = cols * t, h = rows * t;
  ctx.save();
  ctx.lineWidth = 1;
  if (mode === 'single' || mode === 'both') {
    ctx.strokeStyle = 'rgba(212, 166, 87, 0.55)';
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) { ctx.moveTo(c * t + 0.5, 0); ctx.lineTo(c * t + 0.5, h); }
    for (let r = 0; r <= rows; r++) { ctx.moveTo(0, r * t + 0.5); ctx.lineTo(w, r * t + 0.5); }
    ctx.stroke();
  }
  if (mode === 'dual' || mode === 'both') {
    ctx.strokeStyle = 'rgba(120, 200, 240, 0.65)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const half = t / 2;
    for (let c = 0; c <= cols; c++) {
      const x = c * t + half + 0.5;
      if (x > w) break;
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * t + half + 0.5;
      if (y > h) break;
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawHover(ctx: CanvasRenderingContext2D, r: number, c: number, t: number): void {
  const x = c * t, y = r * t;
  ctx.save();
  ctx.strokeStyle = '#d4a657';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, t - 2, t - 2);
  ctx.restore();
}

export async function loadSheet(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${url}`));
    img.src = url;
  });
}
