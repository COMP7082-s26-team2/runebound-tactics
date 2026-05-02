export type UnitTeam = "player" | "enemy";

export type UnitStatsData = {
    name: string;
    health: number;
    attack: number;
    defense: number;
    movement: number;
    attackRange: number;
    team: UnitTeam;
};
