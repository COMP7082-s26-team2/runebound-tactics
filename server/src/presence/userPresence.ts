import { prisma } from "../database/prisma";

// Keep DB status values centralized so room handlers cannot accidentally write
// slightly different strings than the user_presence schema expects.
export const CONNECTION_STATUS = {
    ONLINE: "online",
    IN_LOBBY: "in_lobby",
    IN_GAME: "in_game",
    OFFLINE: "offline",
} as const;

export type ConnectionStatus =
    (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

type PresenceUserId = string | bigint | number;

// Colyseus auth values often arrive as strings, while Prisma stores player_id
// as bigint. Normalize at the boundary before writing presence records.
function toPlayerId(userId: PresenceUserId): bigint {
    return typeof userId === "bigint" ? userId : BigInt(userId);
}

// Record the lobby room the user is currently waiting in. Entering a lobby
// clears any active game room because this row represents one current location.
export async function markUserInLobby(
    userId: PresenceUserId,
    lobbyRoomId: string,
): Promise<void> {
    const playerId = toPlayerId(userId);
    const now = new Date();

    // Upsert lets lobby joins create the presence row the first time and refresh
    // it on later joins without each room needing to check if the row exists.
    await prisma.user_presence.upsert({
        where: {
            user_id: playerId,
        },
        create: {
            user_id: playerId,
            current_lobby_id: lobbyRoomId,
            current_room_id: null,
            connection_status: CONNECTION_STATUS.IN_LOBBY,
            last_seen_at: now,
        },
        update: {
            current_lobby_id: lobbyRoomId,
            current_room_id: null,
            connection_status: CONNECTION_STATUS.IN_LOBBY,
            last_seen_at: now,
        },
    });
}

// Clear the lobby only when the stored lobby matches the room being left. This
// prevents an old leave event from wiping a newer lobby join.
export async function markUserLeftLobby(
    userId: PresenceUserId,
    lobbyRoomId: string,
): Promise<void> {
    const playerId = toPlayerId(userId);

    // updateMany is used because Prisma update requires a unique key only; the
    // extra current_lobby_id condition is what makes this clear operation safe.
    await prisma.user_presence.updateMany({
        where: {
            user_id: playerId,
            current_lobby_id: lobbyRoomId,
        },
        data: {
            current_lobby_id: null,
            connection_status: CONNECTION_STATUS.ONLINE,
            last_seen_at: new Date(),
        },
    });
}

// Record the active game room for game reconnection lookup. Moving into a game
// clears the lobby id because the game room becomes the user's current location.
// records which persisted Supabase session owns this active
// game presence row for future reconnect and single-session enforcement.
export async function markUserInGame(
    userId: PresenceUserId,
    gameRoomId: string,
    supabaseSessionId: string,
): Promise<void> {
    const playerId = toPlayerId(userId);
    const now = new Date();

    // Upsert covers the case where a user enters a game directly before any
    // lobby presence row has been written.
    await prisma.user_presence.upsert({
        where: {
            user_id: playerId,
        },
        create: {
            user_id: playerId,
            current_lobby_id: null,
            current_room_id: gameRoomId,
            supabase_session_id: supabaseSessionId,
            connection_status: CONNECTION_STATUS.IN_GAME,
            last_seen_at: now,
        },
        update: {
            current_lobby_id: null,
            current_room_id: gameRoomId,
            supabase_session_id: supabaseSessionId,
            connection_status: CONNECTION_STATUS.IN_GAME,
            last_seen_at: now,
        },
    });
}

// Clear the game room only when it still matches this game. This keeps a stale
// game-end or leave event from clearing a newer active game room.
export async function markUserLeftGame(
    userId: PresenceUserId,
    gameRoomId: string,
): Promise<void> {
    const playerId = toPlayerId(userId);

    // updateMany allows the user_id + current_room_id guard even though only
    // user_id is the primary key.
    await prisma.user_presence.updateMany({
        where: {
            user_id: playerId,
            current_room_id: gameRoomId,
        },
        data: {
            current_room_id: null,
            connection_status: CONNECTION_STATUS.ONLINE,
            last_seen_at: new Date(),
        },
    });
}

// Mark the user offline after a disconnect. We intentionally keep room/lobby ids
// here so later reconnection flows can still decide where to send the player.
export async function markUserOffline(userId: PresenceUserId): Promise<void> {
    const playerId = toPlayerId(userId);
    const now = new Date();

    // If a disconnect is the first presence event we receive, create an offline
    // row so future joins can update the same user-owned presence record.
    await prisma.user_presence.upsert({
        where: {
            user_id: playerId,
        },
        create: {
            user_id: playerId,
            current_lobby_id: null,
            current_room_id: null,
            connection_status: CONNECTION_STATUS.OFFLINE,
            last_seen_at: now,
        },
        update: {
            connection_status: CONNECTION_STATUS.OFFLINE,
            last_seen_at: now,
        },
    });
}
