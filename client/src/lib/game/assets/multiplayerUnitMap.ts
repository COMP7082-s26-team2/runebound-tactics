import type { UnitStatsData, AppearanceData } from "@/lib/game/components";
import {
    getUnitMovement,
    getUnitDamageType,
    getUnitDefaultWeakness,
} from "@runebound-tactics/shared";

/**
 * Minimal unit-type → stats / appearance mapping for the multiplayer scene.
 *
 * Movement scope only: stats are filled with reasonable defaults so the BFS
 * + render path works. Combat-relevant fields (attack, defense, attackRange)
 * are placeholders until the combat sprint lands.
 *
 * Movement value is sourced from shared `getUnitMovement` — same value the
 * server uses for reachability validation. Keeping the source single keeps
 * client highlights and server validation in lockstep.
 */
export function unitTypeToStats(unitType: string): UnitStatsData {
    const name = unitType.split(":")[1] ?? unitType;
    return {
        name,
        health: 30,
        attack: 5,
        defense: 3,
        movement: getUnitMovement(unitType),
        attackRange: 1,
        damageType: getUnitDamageType(unitType) ?? "",
        weakness: getUnitDefaultWeakness(unitType),
    };
}

/**
 * Asset key follows the existing convention `tilemap:entity:<faction>:<unit>`
 * — matches what UnitRenderSystem expects. If the asset hasn't been loaded
 * (or no AssetHandler is attached to the scene), UnitRenderSystem falls back
 * to a colored square using `color`.
 */
export function unitTypeToAppearance(
    unitType: string,
    ownerId: string,
): AppearanceData {
    return {
        assetKey: `tilemap:entity:${unitType}`,
        animationState: "idle",
        color: ownerToColor(ownerId),
    };
}

function ownerToColor(ownerId: string): string {
    const palette = ["#e25555", "#5577e2", "#55c25e", "#e2c155", "#a955e2"];
    let h = 0;
    for (let i = 0; i < ownerId.length; i++) {
        h = (h * 31 + ownerId.charCodeAt(i)) | 0;
    }
    return palette[Math.abs(h) % palette.length]!;
}
