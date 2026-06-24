import type { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import type { GridCoord } from "@/lib/engine/grid/Grid";
import type { World } from "@/lib/engine/world/World";
import type { TweenManager } from "@/lib/engine/core/TweenManager";
import type { AnimationController } from "@/lib/engine/assets/animationController";
import type { AssetHandler } from "@/lib/engine/assets/assetHandler";
import type { AnimationSequencer } from "@/lib/engine/animation/AnimationSequencer";
import type { TerrainLayer } from "@/lib/game/tilemap";

/**
 * Shared dependency bundle passed to every sequence builder. Keeps builder
 * signatures uniform regardless of which engine subsystems they actually
 * use. Bundled by `MultiplayerGameScene` and threaded into the diff
 * dispatcher.
 */
export interface SequenceDeps {
    world: World;
    tween: TweenManager;
    anim: AnimationController;
    assets: AssetHandler;
    sequencer: AnimationSequencer;
    terrainLayer: TerrainLayer;
}

/** A unit moved (logical position changed in the snapshot diff). */
export interface MoveEvent {
    entityId: EntityId;
    from: GridCoord;
    to: GridCoord;
}

/** A unit attacked another unit. Optionally combined with a move. */
export interface AttackEvent {
    attackerId: EntityId;
    targetId: EntityId;
    /** Attacker's position AFTER the optional walk — equals their cell at the moment of lunge. */
    attackerFinalPos: GridCoord;
    /** If attacker moved this turn, their starting position; otherwise null. */
    attackerPathFrom: GridCoord | null;
    /** Target's position (targets don't move during attacks). */
    targetPos: GridCoord;
    /** True if the target's HP dropped to 0 in this snapshot. */
    targetWillDie: boolean;
    /** Target HP after this snapshot. 0 if dying. */
    targetHpAfter: number;
}

/** A unit despawned without a matched attacker (orphan death — rare in 1v1). */
export interface DeathEvent {
    entityId: EntityId;
}

/** A unit appeared in the snapshot that wasn't in the prior snapshot. */
export interface SpawnEvent {
    unitId: string;
    /** Minimal payload shape; consumers re-look-up via world after spawning. */
    unit: {
        unitId: string;
        ownerId: string;
        unitType: string;
        x: number;
        y: number;
        hp: number;
        hasMoved: boolean;
    };
}

/** Bundle returned by `diffSnapshots`. */
export interface DiffEvents {
    spawns: SpawnEvent[];
    moves: MoveEvent[];
    attacks: AttackEvent[];
    orphanDeaths: DeathEvent[];
}

/**
 * Canonical lite-unit shape extracted from a Colyseus snapshot for diffing.
 * Keeps the diff classifier independent of the schema class.
 */
export interface LiteUnit {
    unitId: string;
    ownerId: string;
    unitType: string;
    x: number;
    y: number;
    hp: number;
    hasMoved: boolean;
    actionPoints: number;
}
