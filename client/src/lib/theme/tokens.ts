type TokenMap = Record<string, string>;

const TOKEN_NAMES = [
    "ink-900", "ink-800", "ink-700", "ink-500", "ink-300",
    "vellum-050", "vellum-200", "vellum-400", "ink-mark", "ink-faded",
    "brass-500", "brass-300", "brass-700",
    "castle-ink", "castle-leaf", "necro-ink", "necro-bone",
    "seal-red", "seal-blue", "seal-amber",
] as const;

let cached: TokenMap | null = null;

export function getTokens(): TokenMap {
    if (cached) return cached;
    if (typeof document === "undefined") return Object.freeze({});
    const style = getComputedStyle(document.documentElement);
    const map: TokenMap = {};
    for (const name of TOKEN_NAMES) {
        map[name] = style.getPropertyValue(`--${name}`).trim();
    }
    cached = Object.freeze(map);
    return cached;
}

export function token(name: (typeof TOKEN_NAMES)[number]): string {
    return getTokens()[name] ?? "";
}
