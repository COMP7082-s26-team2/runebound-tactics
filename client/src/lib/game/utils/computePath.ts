import type { EntityId } from "@/lib/engine/core/ecs/EntityManager";
import type { GridCoord } from "@/lib/engine/grid/Grid";
import { cellKey } from "@/lib/engine";
import type { World } from "@/lib/engine/world/World";

export function computePath(
    world: World,
    entityId: EntityId,
    target: GridCoord,
    maxSteps: number = Infinity,
): GridCoord[] {
    const start = world.gridPositions.get(entityId);
    if (!start) return [];

    const targetKey = cellKey(target);
    const parentMap = new Map<string, GridCoord | null>();
    const queue: Array<{ coord: GridCoord; steps: number }> = [
        { coord: start, steps: 0 },
    ];
    parentMap.set(cellKey(start), null);

    outer: while (queue.length > 0) {
        const { coord, steps } = queue.shift()!;
        if (steps >= maxSteps) continue;

        for (const neighbor of world.grid.getNeighbors(coord)) {
            const key = cellKey(neighbor);
            if (parentMap.has(key)) continue;
            // Allow moving unit to step off its own start cell; block all other occupants
            if (world.occupancyMap.has(key) && world.occupancyMap.get(key) !== entityId) continue;
            parentMap.set(key, coord);
            if (key === targetKey) break outer;
            queue.push({ coord: neighbor, steps: steps + 1 });
        }
    }

    const path: GridCoord[] = [];
    let current: GridCoord | null | undefined = target;
    while (current != null) {
        path.unshift(current);
        current = parentMap.get(cellKey(current));
    }

    return path.length > 0 ? path : [start, target];
}
