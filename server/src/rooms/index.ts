import { Server, LobbyRoom as ColyseusLobbyRoom } from "colyseus";
import { TestRoom } from "./TestRoom";
import { LobbyRoom } from "./LobbyRoom";
import { GameRoom } from "./GameRoom";

export { ROOM_TEST, ROOM_LOBBY, ROOM_GAME, ROOM_LOBBY_LIST } from "./constants";
import { ROOM_TEST, ROOM_LOBBY, ROOM_GAME, ROOM_LOBBY_LIST } from "./constants";

// Register all Colyseus room types here. Adding a new room = one line.
export function registerRooms(server: Server): void {
    server.define(ROOM_TEST, TestRoom);

    // Custom lobby waiting room — players join here before a match.
    // .enableRealtimeListing() makes it visible to ColyseusLobbyRoom (lobby-list).
    server.define(ROOM_LOBBY, LobbyRoom).enableRealtimeListing();

    // Active game session — created programmatically by LobbyRoom, not joinable directly.
    server.define(ROOM_GAME, GameRoom);

    // Built-in Colyseus lobby room — consumed by createLobbyContext() on the client.
    server.define(ROOM_LOBBY_LIST, ColyseusLobbyRoom);
}
