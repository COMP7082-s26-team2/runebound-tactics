// Split discriminated union — canvas-painter (e.g. BindingList) narrows on
// role without runtime checks on mask. v0.1.0 exported these names; new
// types.ts must preserve them so canvas-painter compiles unchanged.
export interface OverlayBaseBinding {
  readonly role: 'base';
  readonly sheetId: string;
  readonly tileIds: readonly number[];
}
export interface OverlayMaskBinding {
  readonly role: 'overlay';
  readonly mask: number;
  readonly sheetId: string;
  readonly tileIds: readonly number[];
}
export type OverlayBinding = OverlayBaseBinding | OverlayMaskBinding;

export interface OverlaySet {
  readonly id: string;
  readonly kind: 'edge-overlay' | 'edge-overlay-pair';
  readonly terrainIds: readonly string[];
  readonly bindings: readonly OverlayBinding[];
}

export interface OverlayTerrain {
  readonly id: string;
  readonly priority: number;
}

export type ClipRegion =
  | 'half-left' | 'half-right' | 'half-top' | 'half-bottom'
  | 'quad-tl' | 'quad-tr' | 'quad-bl' | 'quad-br'
  | 'edge-N' | 'edge-N-tl' | 'edge-N-tr'
  | 'edge-S' | 'edge-S-bl' | 'edge-S-br'
  | 'edge-W' | 'edge-W-tl' | 'edge-W-bl'
  | 'edge-E' | 'edge-E-tr' | 'edge-E-br'
  | 'l7-tl'  | 'l7-br'     | 'l7-both'
  | 'l11-tr' | 'l11-bl'    | 'l11-both'
  | 'l13-tl' | 'l13-br'    | 'l13-both'
  | 'l14-tr' | 'l14-bl'    | 'l14-both';

/** One sprite draw op for a cell. */
export interface DrawOp {
  readonly tileId: number;
  /** Cell-relative clip region; undefined = full cell. */
  readonly clip?: ClipRegion;
}

export interface ResolveOpts {
  /** Return true to suppress this intruder→target overlay entirely.
   *  canvas-painter wires (i,t) => i==='grass' && t==='flatgrass'.
   *  Library default: never skip. */
  readonly skipIntrusion?: (intruderId: string, targetId: string) => boolean;
}
