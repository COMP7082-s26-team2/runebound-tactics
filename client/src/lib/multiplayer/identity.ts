const KEY = "displayName";

function generateName(): string {
    return `Player_${Math.floor(1000 + Math.random() * 9000)}`;
}

export function getDisplayName(): string {
    if (typeof window === "undefined") return "";
    const stored = window.sessionStorage.getItem(KEY);
    if (stored && stored.trim()) return stored.trim().slice(0, 32);
    const generated = generateName();
    window.sessionStorage.setItem(KEY, generated);
    return generated;
}

export function setDisplayName(name: string): void {
    if (typeof window === "undefined") return;
    const trimmed = name.trim().slice(0, 32);
    window.sessionStorage.setItem(KEY, trimmed || generateName());
}
