import type { OverlaySet, OverlayTerrain } from "@/lib/autotile-core";

const SHORTHAND: Readonly<Record<string, string>> = {
    W: "water",
    F: "flatgrass",
    G: "grass",
};

export function decodeMapShorthand(
    map: ReadonlyArray<ReadonlyArray<string>>,
): (string | null)[][] {
    return map.map((row) => row.map((cell) => SHORTHAND[cell] ?? null));
}

export interface TilemapBundle {
    readonly sheet: HTMLImageElement;
    readonly terrains: readonly OverlayTerrain[];
    readonly sets: readonly OverlaySet[];
    readonly terrainGrid: ReadonlyArray<ReadonlyArray<string | null>>;
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = url;
    });
}

export async function loadTilemap(): Promise<TilemapBundle> {
    const [terrains, sets, mapShorthand, sheet] = await Promise.all([
        fetch("/tilemap/terrains.json").then((r) => r.json() as Promise<OverlayTerrain[]>),
        fetch("/tilemap/bindings.json").then((r) => r.json() as Promise<OverlaySet[]>),
        fetch("/tilemap/map.json").then((r) => r.json() as Promise<string[][]>),
        loadImage("/tilemap/GB-LandTileset.png"),
    ]);
    return { sheet, terrains, sets, terrainGrid: decodeMapShorthand(mapShorthand) };
}
