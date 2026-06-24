# autotile-core (vendored)

This is a vendored copy of `@ts-autotile/autotile-core`.

- **Version**: v0.2.1
- **Upstream path**: `~/Documents/.projects/ts-autotile/packages/autotile-core/`
- **Upstream commit**: 7d58db1bbd1485da490a3f20f04336320e0b9acd
- **Vendored at**: 2026-06-21
- **Reason**: pre-1.0 library with no public tarball; in-place integration per design
  `runebound-tactics/tilemap-inplace-integration` v1.0 §1.
- **Local deviation from upstream**: `.js` extension stripped from 9 relative
  imports across `clip-paths.ts`, `resolver.ts`, `canvas.ts`, and `index.ts`.
  Required because Turbopack (Next.js bundler) does not fall back from `.js`
  to `.ts` for relative imports. TypeScript (`moduleResolution: "bundler"`)
  and Jest (`moduleNameMapper` strips `.js$`) tolerate either form. The
  re-vendor procedure must include the equivalent sed:
  `sed -i "s|\\(from '\\./[^']*\\)\\.js'|\\1'|g" *.ts`
- **Replacement target**: switch to `@ts-autotile/autotile-core` tarball, or move with
  engine code into a future `render/` package — see `runebound-tactics/render-package-extract` v1.0 §6.
- **DO NOT hand-edit.** Upstream changes land via re-copy.
