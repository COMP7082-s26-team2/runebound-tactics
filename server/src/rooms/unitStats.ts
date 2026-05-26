export type UnitStatBlock = {
    hp: number;
    movement: number;
    attack: number;
    defense: number;
    attackRange: number;
};

export const UNIT_STATS: Record<string, UnitStatBlock> = {
    swordsman:    { hp: 100, movement: 5, attack: 10, defense: 5, attackRange: 1 },
    archer:       { hp: 70,  movement: 4, attack: 12, defense: 3, attackRange: 2 },
    griffin:      { hp: 90,  movement: 6, attack: 11, defense: 4, attackRange: 1 },
    paladin:      { hp: 120, movement: 4, attack: 9,  defense: 8, attackRange: 1 },
    death_knight: { hp: 110, movement: 5, attack: 12, defense: 6, attackRange: 1 },
    ghost:        { hp: 60,  movement: 7, attack: 8,  defense: 2, attackRange: 1 },
    skeleton:     { hp: 70,  movement: 5, attack: 9,  defense: 3, attackRange: 1 },
    vampire:      { hp: 90,  movement: 5, attack: 11, defense: 4, attackRange: 1 },
};

export const SIDE_POSITIONS: Array<Array<{ x: number; y: number }>> = [
    [{ x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }], // top
    [{ x: 3, y: 9 }, { x: 4, y: 9 }, { x: 5, y: 9 }, { x: 6, y: 9 }], // bottom
    [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 }, { x: 0, y: 6 }], // left
    [{ x: 9, y: 3 }, { x: 9, y: 4 }, { x: 9, y: 5 }, { x: 9, y: 6 }], // right
];

export const FACTION_ROSTERS: Record<string, string[]> = {
    castle:     ["swordsman", "archer", "griffin", "paladin"],
    necropolis: ["death_knight", "ghost", "skeleton", "vampire"],
};
