export interface PendingGameData {
    players: { displayName: string; faction: string }[];
}

/**
 * In-process registry: lobbyRoomId → PendingGameData.
 * Written by LobbyRoom._startGame() before matchMaker.createRoom().
 * Read and deleted by GameRoom.onCreate() using the lobbyRoomId option.
 */
export const pendingGames = new Map<string, PendingGameData>();
