"use server";

import { createHmac } from "crypto";
import prisma from "@/lib/prisma";
import type { Session } from "@supabase/supabase-js";

// Name of the server-only secret used to derive non-reversible session IDs.
const SESSION_ID_SECRET = "SESSION_ID_SECRET";
// Supabase session.expires_at is Unix seconds, but we need date
const MILLISECONDS_PER_SECOND = 1000;

// Normalized session data that is safe to persist in our own database.
export interface PersistableAuthSession {
    // Supabase Auth user UUID; maps to player.auth_id in our app database.
    authId: string;
    // Absolute expiry timestamp for the current Supabase access token.
    expiresAt: Date;
    // HMAC-derived identifier for this Supabase session token.
    supabaseSessionId: string;
}

// Explicit result shape keeps auth actions from exposing DB details to the UI.
export type PersistAuthSessionResult =
    | { success: true }
    | { success: false; error: string };

// Derives a non-raw database identifier from the current access token.
// HMAC-SHA256 lets us recognize the same token without storing the token itself.
export function deriveSupabaseSessionId(accessToken: string): string {
    const secret = process.env[SESSION_ID_SECRET];

    // Fail during server-side auth persistence if the deployment has not
    if (!secret) {
        throw new Error(`${SESSION_ID_SECRET} is required`);
    }

    // Return a 64-character hex string suitable for user_sessions.supabase_session_id.
    return createHmac("sha256", secret)
        .update(accessToken)
        .digest("hex");
}

// Converts Supabase's session object into the exact fields our DB layer needs.
// Returns null when Supabase did not provide a complete persistable session.
export function toPersistableAuthSession(
    session: Session | null,
): PersistableAuthSession | null {
    // access_token identifies the browser/device session, expires_at drives DB
    // expiry, and user.id links back to the app's player.auth_id.
    if (!session?.access_token || !session.expires_at || !session.user?.id) {
        return null;
    }

    // Supabase expires_at is Unix seconds; Prisma/Postgres expects Date values.
    return {
        authId: session.user.id,
        expiresAt: new Date(session.expires_at * MILLISECONDS_PER_SECOND),
        supabaseSessionId: deriveSupabaseSessionId(session.access_token),
    };
}

// Writes or refreshes the current Supabase session in our server-side DB table.
export async function persistAuthSession(
    session: Session | null,
): Promise<PersistAuthSessionResult> {
    const persistableSession = toPersistableAuthSession(session);

    // Without a complete Supabase session, there is no stable device/session id
    // to persist for later single-session enforcement or reconnect lookup.
    if (!persistableSession) {
        return { success: false, error: "Missing persistable auth session." };
    }

    // player.auth_id stores the Supabase Auth user UUID; user_sessions.user_id
    // stores the app's player.player_id foreign key.
    const player = await prisma.player.findUnique({
        where: { auth_id: persistableSession.authId },
        select: { player_id: true },
    });

    if (!player) {
        return { success: false, error: "Player profile was not found." };
    }

    const now = new Date();

    // Upsert makes login idempotent for the same Supabase token while refreshes
    // can extend expires_at and last_active_at without creating duplicates.
    await prisma.user_sessions.upsert({
        where: {
            supabase_session_id: persistableSession.supabaseSessionId,
        },
        create: {
            user_id: player.player_id,
            supabase_session_id: persistableSession.supabaseSessionId,
            expires_at: persistableSession.expiresAt,
            is_active: true,
            last_active_at: now,
        },
        update: {
            user_id: player.player_id,
            expires_at: persistableSession.expiresAt,
            is_active: true,
            last_active_at: now,
        },
    });

    return { success: true };
}
