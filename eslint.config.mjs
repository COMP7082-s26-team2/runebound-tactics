import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// no-restricted-syntax matches a regex literal in esquery selectors.
// \b and \d below are written with one backslash in JS source → one
// backslash in the resulting regex. Two backslashes would produce a
// literal \b / \d match and break the rule silently.
const FORBIDDEN_TAILWIND_COLOR_PATTERN =
    "/\\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|caret|accent|decoration|shadow)-(?:slate|gray|zinc|neutral|stone|indigo|emerald|rose|amber|teal|sky|violet|fuchsia|pink|cyan|red|orange|yellow|green|blue|lime)-\\d+\\b/";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "client/.next/**",
    "client/out/**",
    "client/next-env.d.ts",
    "server/dist/**",
    // Vendored library — see client/src/lib/autotile-core/VENDOR.md.
    "client/src/lib/autotile-core/**",
  ]),
  {
    files: ["client/src/**/*.{ts,tsx}"],
    ignores: [
      "client/src/components/game/**",
      "client/src/components/scenes/**",
      "client/src/lib/game/**",
      // Dev-only test pages and the singleplayer demo (gameplay-adjacent):
      // not user-facing UI, so design-token discipline is not required.
      "client/src/app/grid-movement-test/**",
      "client/src/app/input-test/**",
      "client/src/app/turn-test/**",
      "client/src/app/colyseus-test/**",
      "client/src/app/game/page.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=${FORBIDDEN_TAILWIND_COLOR_PATTERN}]`,
          message:
            "Use design tokens via [var(--token)] instead of raw Tailwind color shorthand (slate-/gray-/indigo-/emerald-/rose-/amber-/etc.). See ui-design-system v1.5.",
        },
        {
          selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=${FORBIDDEN_TAILWIND_COLOR_PATTERN}]`,
          message:
            "Use design tokens via [var(--token)] instead of raw Tailwind color shorthand inside template literals.",
        },
      ],
    },
  },
]);

export default eslintConfig;
