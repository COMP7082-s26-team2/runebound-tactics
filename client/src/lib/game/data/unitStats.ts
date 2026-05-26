export type ClientUnitStats = {
    movement: number;
    attack: number;
    defense: number;
    attackRange: number;
    name: string;
};

export const CLIENT_UNIT_STATS: Record<string, ClientUnitStats> = {
    swordsman:    { movement: 5, attack: 10, defense: 5, attackRange: 1, name: "Swordsman" },
    archer:       { movement: 4, attack: 12, defense: 3, attackRange: 2, name: "Archer" },
    griffin:      { movement: 6, attack: 11, defense: 4, attackRange: 1, name: "Griffin" },
    paladin:      { movement: 4, attack: 9,  defense: 8, attackRange: 1, name: "Paladin" },
    death_knight: { movement: 5, attack: 12, defense: 6, attackRange: 1, name: "Death Knight" },
    ghost:        { movement: 7, attack: 8,  defense: 2, attackRange: 1, name: "Ghost" },
    skeleton:     { movement: 5, attack: 9,  defense: 3, attackRange: 1, name: "Skeleton" },
    vampire:      { movement: 5, attack: 11, defense: 4, attackRange: 1, name: "Vampire" },
};
