import { AssetDescriptor, AssetManifest, SpriteSheetDefinition } from "./types";

/**
 * AssetHandler manages loading, caching, and synchronous retrieval of game assets.
 * Designed to be instantiated once globally and passed to scenes/systems via dependency injection.
 */
export class AssetHandler {
    private _manifest: AssetManifest;
    private _cache: Map<string, HTMLImageElement> = new Map();
    private _loading: Set<string> = new Set();

    constructor(manifest: AssetManifest) {
        this._manifest = manifest;
    }

    /**
     * Preloads all assets matching the given keys.
     * @param keys Array of asset keys from the manifest
     * @param onProgress Optional callback reporting (loaded, total) progress
     * @returns Promise that resolves when all assets are loaded
     */
    async preload(
        keys: string[],
        onProgress?: (loaded: number, total: number) => void
    ): Promise<void> {
        const total = keys.length;
        let loaded = 0;

        const promises = keys.map((key) =>
            this._loadAsset(key)
                .then(() => {
                    loaded++;
                    onProgress?.(loaded, total);
                })
                .catch((err: unknown) => {
                    console.warn(`[AssetHandler] Failed to load "${key}":`, err);
                })
        );

        await Promise.all(promises);
    }

    /**
     * Retrieves a cached asset by key. Must only be called after preload resolves.
     * @param key Asset key from the manifest
     * @returns The loaded HTMLImageElement
     * @throws Error if the key was never loaded
     */
    get(key: string): HTMLImageElement {
        const asset = this._cache.get(key);
        if (!asset) {
            throw new Error(`Asset "${key}" not loaded. Did you forget to preload it?`);
        }
        return asset;
    }

    /**
     * Returns the SpriteSheetDefinition for a key, if present.
     * @param key Asset key from the manifest
     * @returns The SpriteSheetDefinition or undefined if not an entity tilemap
     */
    getSpriteSheet(key: string): SpriteSheetDefinition | undefined {
        const descriptor = this._manifest[key];
        return descriptor?.spriteSheet;
    }

    /**
     * Returns true if the key is cached and ready.
     * @param key Asset key from the manifest
     */
    has(key: string): boolean {
        return this._cache.has(key);
    }

    /**
     * Removes specific cached entries. Useful for cleaning up scene-exclusive assets.
     * @param keys Array of asset keys to unload
     */
    unload(keys: string[]): void {
        keys.forEach((key) => {
            this._cache.delete(key);
        });
    }

    /**
     * Clears all cached assets.
     */
    clear(): void {
        this._cache.clear();
    }

    /**
     * Internal: loads a single asset and caches it.
     */
    private _loadAsset(key: string): Promise<void> {
        if (this._cache.has(key)) return Promise.resolve();
        if (this._loading.has(key)) return this._waitForLoad(key);

        const descriptor = this._manifest[key];
        if (!descriptor) {
            return Promise.reject(new Error(`Asset key "${key}" not found in manifest`));
        }

        this._loading.add(key);

        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                this._cache.set(key, img);
                this._loading.delete(key);
                resolve();
            };

            img.onerror = (e) => {
                this._loading.delete(key);
                console.warn(`[AssetHandler] onerror for "${key}" src="${descriptor.src}"`, e);
                reject(new Error(`Failed to load image: ${descriptor.src}`));
            };

            img.src = descriptor.src;
        });
    }

    private _waitForLoad(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (this._cache.has(key)) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (!this._loading.has(key)) {
                    // loading finished but not cached — failed
                    clearInterval(checkInterval);
                    reject(new Error(`Asset "${key}" failed to load`));
                }
            }, 10);
        });
    }
}
