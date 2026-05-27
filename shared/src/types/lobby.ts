/**
 * Room metadata shape for Colyseus lobby room listings.
 *
 * Set server-side via `this.setMetadata({...})` inside LobbyRoom.
 * Consumed client-side via `createLobbyContext<LobbySummary>()`.
 * This is a plain interface — NOT a Colyseus Schema class.
 */
export interface LobbySummary {
    lobbyName: string;
    hostDisplayName: string;
    playerCount: number;
    maxPlayers: number;
    status: "waiting" | "starting";
}
