"use server";

import prisma from "@/lib/prisma";
import { createServerSideClient } from "@/lib/supabase";
import { ROOM_LOBBY } from "@runebound-tactics/shared";

// Shape returned by the Colyseus /rooms/lobby endpoint. BCOMP-167 only needs
// the room id and metadata status to decide if a stored lobby can be rejoined.
interface LobbyRoomListing {
    roomId: string;
    metadata?: {
        status?: string;
    };
}

export type LobbyReconnectTarget =
    | { target: "none" }
    | { target: "lobby"; lobbyRoomId: string };

// Client code connects to Colyseus over ws://, but the room-list endpoint is
// served over HTTP by the same host/port.
function colyseusHttpBase(): string {
    const colyseusUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";
    return colyseusUrl.replace(/^ws/, "http");
}

// A lobby is considered reconnectable only if it still exists in Colyseus and
// is still waiting for players. Starting/transferring rooms should not be used
// as lobby reconnect targets.
async function findOpenLobbyRoom(
    lobbyRoomId: string,
): Promise<LobbyRoomListing | null> {
    const response = await fetch(`${colyseusHttpBase()}/rooms/${ROOM_LOBBY}`, {
        cache: "no-store",
    });

    if (!response.ok) {
        return null;
    }

    const rooms = (await response.json()) as LobbyRoomListing[];
    const room = rooms.find(candidate => candidate.roomId === lobbyRoomId);

    if (room?.metadata?.status !== "waiting") {
        return null;
    }

    return room;
}

async function clearStaleLobbyPresence(
    userId: bigint,
    lobbyRoomId: string,
): Promise<void> {
    // Guard by both user and lobby id so an old app-load check cannot clear a
    // newer lobby that was written after this action started.
    await prisma.user_presence.updateMany({
        where: {
            user_id: userId,
            current_lobby_id: lobbyRoomId,
        },
        data: {
            current_lobby_id: null,
            connection_status: "online",
            last_seen_at: new Date(),
        },
    });
}

// Server action used on app/lobby-selection load. It reads the authenticated
// player's persisted presence row and returns where the client should go next.
export async function getLobbyReconnectTarget(): Promise<LobbyReconnectTarget> {
    const supabase = await createServerSideClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return { target: "none" };
    }

    // player.auth_id stores the Supabase Auth UUID; user_presence is keyed by
    // the app's player.player_id.
    const player = await prisma.player.findUnique({
        where: {
            auth_id: user.id,
        },
        select: {
            player_id: true,
        },
    });

    if (!player) {
        return { target: "none" };
    }

    // A missing current_lobby_id means there is no persisted lobby to recover.
    const presence = await prisma.user_presence.findUnique({
        where: {
            user_id: player.player_id,
        },
        select: {
            current_lobby_id: true,
        },
    });

    if (!presence?.current_lobby_id) {
        return { target: "none" };
    }

    // Do not trust the DB id alone; the Colyseus room might have closed since
    // the presence row was last written.
    const openLobby = await findOpenLobbyRoom(presence.current_lobby_id);

    if (!openLobby) {
        await clearStaleLobbyPresence(player.player_id, presence.current_lobby_id);
        return { target: "none" };
    }

    return {
        target: "lobby",
        lobbyRoomId: openLobby.roomId,
    };
}
