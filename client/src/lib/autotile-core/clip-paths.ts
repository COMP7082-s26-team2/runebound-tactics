import type { ClipRegion } from './types';

export type Triangle =
  | 'TL_LL' | 'TL_UR'
  | 'TR_UL' | 'TR_LR'
  | 'BR_UR' | 'BR_LL'
  | 'BL_LR' | 'BL_UL';

export const SUBTRACTIONS: ReadonlyMap<ClipRegion, readonly Triangle[]> = new Map([
  ['edge-N-tl', ['TL_LL']], ['edge-N-tr', ['TR_LR']], ['edge-N', ['TL_LL', 'TR_LR']],
  ['edge-S-bl', ['BL_UL']], ['edge-S-br', ['BR_UR']], ['edge-S', ['BL_UL', 'BR_UR']],
  ['edge-W-tl', ['TL_UR']], ['edge-W-bl', ['BL_LR']], ['edge-W', ['TL_UR', 'BL_LR']],
  ['edge-E-tr', ['TR_UL']], ['edge-E-br', ['BR_LL']], ['edge-E', ['TR_UL', 'BR_LL']],
  ['l7-tl',     ['TL_LL']], ['l7-br',     ['BR_LL']], ['l7-both',  ['TL_LL', 'BR_LL']],
  ['l11-tr',    ['TR_LR']], ['l11-bl',    ['BL_LR']], ['l11-both', ['TR_LR', 'BL_LR']],
  ['l13-tl',    ['TL_UR']], ['l13-br',    ['BR_UR']], ['l13-both', ['TL_UR', 'BR_UR']],
  ['l14-tr',    ['TR_UL']], ['l14-bl',    ['BL_UL']], ['l14-both', ['TR_UL', 'BL_UL']],
]);

/** Apply a clip to ctx that subtracts the named triangle from the cell at (x,y) with side length t. */
export function clipMinusTriangle(
  ctx: CanvasRenderingContext2D,
  tri: Triangle,
  x: number,
  y: number,
  t: number,
): void {
  const h = t / 2;
  const TL: [number, number] = [x,     y];
  const TR: [number, number] = [x + t, y];
  const BR: [number, number] = [x + t, y + t];
  const BL: [number, number] = [x,     y + t];
  const TM: [number, number] = [x + h, y];
  const RM: [number, number] = [x + t, y + h];
  const BM: [number, number] = [x + h, y + t];
  const LM: [number, number] = [x,     y + h];
  const C : [number, number] = [x + h, y + h];
  let poly: ReadonlyArray<[number, number]>;
  switch (tri) {
    case 'TL_LL': poly = [TL, TR, BR, BL, LM, C]; break;
    case 'TL_UR': poly = [TL, C, TM, TR, BR, BL]; break;
    case 'TR_UL': poly = [TL, TM, C, TR, BR, BL]; break;
    case 'TR_LR': poly = [TL, TR, C, RM, BR, BL]; break;
    case 'BR_UR': poly = [TL, TR, RM, C, BR, BL]; break;
    case 'BR_LL': poly = [TL, TR, BR, C, BM, BL]; break;
    case 'BL_LR': poly = [TL, TR, BR, BM, C, BL]; break;
    case 'BL_UL': poly = [TL, TR, BR, BL, C, LM]; break;
  }
  ctx.beginPath();
  ctx.moveTo(poly[0]![0], poly[0]![1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i]![0], poly[i]![1]);
  ctx.closePath();
  ctx.clip();
}
