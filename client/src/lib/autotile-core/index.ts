// packages/autotile-core/src/index.ts
// Re-export the split union AND the named subtypes (canvas-painter
// imports OverlayBaseBinding / OverlayMaskBinding directly per pre-flight).
export type {
  OverlayBinding, OverlayBaseBinding, OverlayMaskBinding,
  OverlaySet, OverlayTerrain,
  ClipRegion, DrawOp, ResolveOpts,
} from './types';
export { resolveCellOps } from './resolver';
export { SUBTRACTIONS } from './clip-paths';
export type { Triangle } from './clip-paths';
