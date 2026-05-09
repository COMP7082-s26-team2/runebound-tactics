export class RoomRegistry {
    private static _active = new Set<string>();

    static register(code: string): void {
        this._active.add(code);
    }

    static release(code: string): void {
        this._active.delete(code);
    }

    static has(code: string): boolean {
        return this._active.has(code);
    }
}

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateShortCode(length = 6): string {
    let code: string;
    do {
        code = Array.from({ length }, () =>
            CHARS[Math.floor(Math.random() * CHARS.length)]
        ).join("");
    } while (RoomRegistry.has(code));
    return code;
}
