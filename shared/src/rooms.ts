export const ROOM_TEST       = "test"       as const;
export const ROOM_LOBBY      = "lobby"      as const;
export const ROOM_GAME       = "game_room"  as const;
export const ROOM_LOBBY_LIST = "lobby-list" as const;

export type RoomName =
    | typeof ROOM_TEST
    | typeof ROOM_LOBBY
    | typeof ROOM_GAME
    | typeof ROOM_LOBBY_LIST;
