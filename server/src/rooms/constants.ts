// Room name constants — import from here to avoid string drift between server and client.
// Client-side contexts must connect using these exact strings.

export const ROOM_TEST       = "test";
export const ROOM_LOBBY      = "lobby";
export const ROOM_GAME       = "game_room";
export const ROOM_LOBBY_LIST = "lobby-list"; // built-in ColyseusLobbyRoom; consumed by createLobbyContext()
