import {
    CHOKEPOINT_MAP,
    type TerrainGrid,
} from "@runebound-tactics/shared";
import type { OverlaySet, OverlayTerrain } from "@/lib/autotile-core";

export interface TilemapBundle {
    readonly sheet: HTMLImageElement;
    readonly terrains: readonly OverlayTerrain[];
    readonly sets: readonly OverlaySet[];
    readonly terrainGrid: TerrainGrid;
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = url;
    });
}

/**
 * Loads the static assets needed to render the chokepoint map. The map
 * itself is no longer fetched — it's a compile-time const in
 * shared/src/game/terrain/maps/chokepointMap so both server and client
 * see identical terrain.
 */
export async function loadTilemap(): Promise<TilemapBundle> {
    const [terrains, sets, sheet] = await Promise.all([
        fetch("/tilemap/terrains.json").then(
            (r) => r.json() as Promise<OverlayTerrain[]>,
        ),
        fetch("/tilemap/bindings.json").then(
            (r) => r.json() as Promise<OverlaySet[]>,
        ),
        loadImage("/tilemap/GB-LandTileset.png"),
    ]);
    return { sheet, terrains, sets, terrainGrid: CHOKEPOINT_MAP };
}
