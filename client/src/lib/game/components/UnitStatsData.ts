export type UnitStatsData = {
    name: string;
    health: number;
    attack: number;
    defense: number;
    movement: number;
    attackRange: number;
    damageType: string;
    weakness: readonly string[];
};
