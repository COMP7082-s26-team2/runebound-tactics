import { Server } from "colyseus";
import { TestRoom } from "./TestRoom";

// Room name constants — import these on the client side too to avoid string drift
export const ROOM_TEST = "test";
// export const ROOM_LOBBY = "lobby";
// export const ROOM_LOBBY_LIST = "lobby-list";

// Register all Colyseus room types here. Adding a new room = one line.
export function registerRooms(server: Server): void {
    server.define(ROOM_TEST, TestRoom);
    // server.define(ROOM_LOBBY, LobbyRoom);
    // server.define(ROOM_LOBBY_LIST, LobbyListRoom, { maxClients: 200 });
}
