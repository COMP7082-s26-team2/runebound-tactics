import type {
  ClipRegion, DrawOp, OverlaySet, OverlayTerrain, ResolveOpts,
} from './types';

type Dir = 'N' | 'S' | 'W' | 'E' | 'NW' | 'NE' | 'SW' | 'SE';

const DIR_OFFSETS: ReadonlyMap<Dir, readonly [number, number]> = new Map([
  ['N',  [-1,  0]], ['S',  [+1,  0]], ['W',  [ 0, -1]], ['E',  [ 0, +1]],
  ['NW', [-1, -1]], ['NE', [-1, +1]], ['SW', [+1, -1]], ['SE', [+1, +1]],
]);

const SINGLE_EDGE_MASK: ReadonlyMap<Dir, number> = new Map([
  ['W', 0b1001], ['E', 0b0110], ['N', 0b0011], ['S', 0b1100],
]);

const DIAG_INFO: ReadonlyArray<readonly [Dir, Dir, Dir, number]> = [
  ['NW', 'N', 'W', 0b0001],
  ['NE', 'N', 'E', 0b0010],
  ['SW', 'S', 'W', 0b1000],
  ['SE', 'S', 'E', 0b0100],
];

interface TerrainIndex {
  defaultByTerrain: Map<string, OverlaySet>;
  pairsByIntruder: Map<string, OverlaySet[]>;
  terrainById: Map<string, OverlayTerrain>;
}

function indexSets(sets: readonly OverlaySet[], terrains: readonly OverlayTerrain[]): TerrainIndex {
  const defaultByTerrain = new Map<string, OverlaySet>();
  const pairsByIntruder = new Map<string, OverlaySet[]>();
  for (const s of sets) {
    if (s.kind === 'edge-overlay' && s.terrainIds.length === 1 && s.terrainIds[0]) {
      defaultByTerrain.set(s.terrainIds[0], s);
    } else if (s.kind === 'edge-overlay-pair' && s.terrainIds[0]) {
      const list = pairsByIntruder.get(s.terrainIds[0]) ?? [];
      list.push(s);
      pairsByIntruder.set(s.terrainIds[0], list);
    }
  }
  return { defaultByTerrain, pairsByIntruder, terrainById: new Map(terrains.map(t => [t.id, t])) };
}

function baseTileFor(set: OverlaySet | undefined): number | null {
  if (!set) return null;
  for (const b of set.bindings) if (b.role === 'base' && b.tileIds[0] != null) return b.tileIds[0];
  return null;
}

function overlayTileFor(set: OverlaySet | undefined, mask: number): number | null {
  if (!set) return null;
  for (const b of set.bindings) {
    if (b.role === 'overlay' && b.mask === mask && b.tileIds[0] != null) return b.tileIds[0];
  }
  return null;
}

function lookupIntrusionTile(
  intruder: string, target: string, mask: number, idx: TerrainIndex,
): number | null {
  const pairs = idx.pairsByIntruder.get(intruder);
  if (pairs) {
    for (const p of pairs) {
      if (p.terrainIds[1] === target) {
        const t = overlayTileFor(p, mask);
        if (t != null) return t;
      }
    }
  }
  return overlayTileFor(idx.defaultByTerrain.get(intruder), mask);
}

/**
 * Resolve one cell at (r, c) into an ordered list of draw operations
 * (base tile first, then zero or more overlays with optional clip regions).
 *
 * Pure function — no DOM, no canvas. Safe to call in Node.
 */
export function resolveCellOps(
  world: ReadonlyArray<ReadonlyArray<string | null>>,
  r: number,
  c: number,
  sets: readonly OverlaySet[],
  terrains: readonly OverlayTerrain[],
  opts: ResolveOpts = {},
): DrawOp[] {
  const rows = world.length;
  const cols = rows > 0 ? world[0]!.length : 0;
  const id = world[r]?.[c] ?? null;
  if (!id) return [];

  const idx = indexSets(sets, terrains);
  const ops: DrawOp[] = [];

  // Pass 1 — base tile.
  const ownSet = idx.defaultByTerrain.get(id);
  const baseTile = baseTileFor(ownSet);
  if (baseTile != null) ops.push({ tileId: baseTile });

  const ownTerrain = idx.terrainById.get(id);
  if (!ownTerrain) return ops;
  const ownPriority = ownTerrain.priority;

  // Pass 2 — collect intruders per direction.
  const intruders: Partial<Record<Dir, string>> = {};
  for (const [dir, [dr, dc]] of DIR_OFFSETS) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
    const nid = world[nr]?.[nc] ?? null;
    if (!nid) continue;
    if (opts.skipIntrusion?.(nid, id)) continue;
    const nt = idx.terrainById.get(nid);
    if (!nt) continue;
    if (nt.priority <= ownPriority) continue;
    intruders[dir] = nid;
  }

  // L-pair detection.
  const lpNW = (intruders.N && intruders.W && intruders.N === intruders.W) ? intruders.N : null;
  const lpNE = (intruders.N && intruders.E && intruders.N === intruders.E) ? intruders.N : null;
  const lpSW = (intruders.S && intruders.W && intruders.S === intruders.W) ? intruders.S : null;
  const lpSE = (intruders.S && intruders.E && intruders.S === intruders.E) ? intruders.S : null;
  const consumed = new Set<Dir>();
  const lDraws: Array<[string, number, ClipRegion | undefined]> = [];

  if (lpNW && lpNW === lpNE && lpNW === lpSW && lpNW === lpSE) {
    // Full enclosure: always decompose into 4 quadrant-clipped L-masks.
    // Mask 15 bindings in practice tend to be placeholders (e.g. an
    // edge-sprite reused) that render incorrectly when stretched across
    // the cell; the curated mask 7/11/13/14 L-shapes compose cleanly.
    lDraws.push([lpNW, 11, 'quad-tl']);
    lDraws.push([lpNW,  7, 'quad-tr']);
    lDraws.push([lpNW, 13, 'quad-bl']);
    lDraws.push([lpNW, 14, 'quad-br']);
    consumed.add('N'); consumed.add('S'); consumed.add('W'); consumed.add('E');
  } else if (lpNW && lpNE && lpNW === lpNE) {
    lDraws.push([lpNW, 11, 'half-left']);
    lDraws.push([lpNE, 7,  'half-right']);
    consumed.add('N'); consumed.add('W'); consumed.add('E');
    if (lpSW) { lDraws.push([lpSW, 13, undefined]); consumed.add('S'); }
    if (lpSE) { lDraws.push([lpSE, 14, undefined]); consumed.add('S'); }
  } else if (lpSW && lpSE && lpSW === lpSE) {
    lDraws.push([lpSW, 13, 'half-left']);
    lDraws.push([lpSE, 14, 'half-right']);
    consumed.add('S'); consumed.add('W'); consumed.add('E');
    if (lpNW) { lDraws.push([lpNW, 11, undefined]); consumed.add('N'); }
    if (lpNE) { lDraws.push([lpNE, 7, undefined]);  consumed.add('N'); }
  } else if (lpNW && lpSW && lpNW === lpSW) {
    lDraws.push([lpNW, 11, 'half-top']);
    lDraws.push([lpSW, 13, 'half-bottom']);
    consumed.add('N'); consumed.add('S'); consumed.add('W');
    if (lpNE) { lDraws.push([lpNE, 7, undefined]);  consumed.add('E'); }
    if (lpSE) { lDraws.push([lpSE, 14, undefined]); consumed.add('E'); }
  } else if (lpNE && lpSE && lpNE === lpSE) {
    lDraws.push([lpNE, 7,  'half-top']);
    lDraws.push([lpSE, 14, 'half-bottom']);
    consumed.add('N'); consumed.add('S'); consumed.add('E');
    if (lpNW) { lDraws.push([lpNW, 11, undefined]); consumed.add('W'); }
    if (lpSW) { lDraws.push([lpSW, 13, undefined]); consumed.add('W'); }
  } else {
    const lCut = (
      cut1: boolean, cut2: boolean,
      both: ClipRegion, only1: ClipRegion, only2: ClipRegion,
    ): ClipRegion | undefined =>
      cut1 && cut2 ? both : cut1 ? only1 : cut2 ? only2 : undefined;
    if (lpNW) {
      const cutTR = intruders.E != null && intruders.E !== lpNW;
      const cutBL = intruders.S != null && intruders.S !== lpNW;
      lDraws.push([lpNW, 11, lCut(cutTR, cutBL, 'l11-both', 'l11-tr', 'l11-bl')]);
      consumed.add('N'); consumed.add('W');
    }
    if (lpNE) {
      const cutTL = intruders.W != null && intruders.W !== lpNE;
      const cutBR = intruders.S != null && intruders.S !== lpNE;
      lDraws.push([lpNE, 7, lCut(cutTL, cutBR, 'l7-both', 'l7-tl', 'l7-br')]);
      consumed.add('N'); consumed.add('E');
    }
    if (lpSW) {
      const cutTL = intruders.N != null && intruders.N !== lpSW;
      const cutBR = intruders.E != null && intruders.E !== lpSW;
      lDraws.push([lpSW, 13, lCut(cutTL, cutBR, 'l13-both', 'l13-tl', 'l13-br')]);
      consumed.add('S'); consumed.add('W');
    }
    if (lpSE) {
      const cutTR = intruders.N != null && intruders.N !== lpSE;
      const cutBL = intruders.W != null && intruders.W !== lpSE;
      lDraws.push([lpSE, 14, lCut(cutTR, cutBL, 'l14-both', 'l14-tr', 'l14-bl')]);
      consumed.add('S'); consumed.add('E');
    }
  }

  // Diagonals (suppressed when adjacent edge intrudes).
  const diagonalDraws: Array<[string, number, ClipRegion | undefined]> = [];
  for (const [d, e1, e2, mask] of DIAG_INFO) {
    const t = intruders[d];
    if (!t) continue;
    if (intruders[e1] || intruders[e2]) continue;
    diagonalDraws.push([t, mask, undefined]);
  }

  // Singletons with corner-cut detection.
  const singletonDraws: Array<[string, number, ClipRegion | undefined]> = [];
  for (const edge of ['W', 'E', 'N', 'S'] as const) {
    if (consumed.has(edge)) continue;
    const t = intruders[edge];
    if (!t) continue;
    let cutA = false, cutB = false;
    let suffixA = '', suffixB = '';
    if (edge === 'N') {
      cutA = intruders.W != null && intruders.W !== t; suffixA = '-tl';
      cutB = intruders.E != null && intruders.E !== t; suffixB = '-tr';
    } else if (edge === 'S') {
      cutA = intruders.W != null && intruders.W !== t; suffixA = '-bl';
      cutB = intruders.E != null && intruders.E !== t; suffixB = '-br';
    } else if (edge === 'W') {
      cutA = intruders.N != null && intruders.N !== t; suffixA = '-tl';
      cutB = intruders.S != null && intruders.S !== t; suffixB = '-bl';
    } else {
      cutA = intruders.N != null && intruders.N !== t; suffixA = '-tr';
      cutB = intruders.S != null && intruders.S !== t; suffixB = '-br';
    }
    let clip: ClipRegion | undefined;
    if (cutA && cutB)      clip = `edge-${edge}` as ClipRegion;
    else if (cutA)         clip = `edge-${edge}${suffixA}` as ClipRegion;
    else if (cutB)         clip = `edge-${edge}${suffixB}` as ClipRegion;
    singletonDraws.push([t, SINGLE_EDGE_MASK.get(edge)!, clip]);
  }

  // Order: diagonals → singletons → L-pairs (L-pairs last, on top).
  const orderedDraws = [...diagonalDraws, ...singletonDraws, ...lDraws];

  // Dedup by (mask, tile, clip).
  const drawn = new Set<string>();
  for (const [terrain, mask, clip] of orderedDraws) {
    const tile = lookupIntrusionTile(terrain, id, mask, idx);
    if (tile == null) continue;
    const key = `${mask}:${tile}:${clip ?? ''}`;
    if (drawn.has(key)) continue;
    drawn.add(key);
    if (clip) {
      ops.push({ tileId: tile, clip });
    } else {
      ops.push({ tileId: tile });
    }
  }

  return ops;
}
