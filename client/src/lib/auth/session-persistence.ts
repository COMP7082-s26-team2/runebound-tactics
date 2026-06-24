import "server-only";

import { createHmac } from "crypto";
import prisma from "@/lib/prisma";
import type { Session } from "@supabase/supabase-js";

// Name of the server-only secret used to derive non-reversible session IDs.
const SESSION_ID_SECRET = "SESSION_ID_SECRET";
// Supabase session.expires_at is Unix seconds, but we need date
const MILLISECONDS_PER_SECOND = 1000;
// Generic error returned to auth callers so token, secret, and DB details stay
// in server logs instead of leaking to the UI.
const SESSION_PERSISTENCE_ERROR = "Auth session could not be persisted.";

// Normalized session data that is safe to persist in our own database.
export interface PersistableAuthSession {
    // Supabase Auth user UUID; maps to player.auth_id in our app database.
    authId: string;
    // Absolute expiry timestamp for the current Supabase access token.
    expiresAt: Date;
    // HMAC-derived identifier for this Supabase session token.
    supabaseSessionId: string;
}

// Internal parse result keeps detailed failure reasons available for logs while
// callers still receive the generic PersistAuthSessionResult error.
type SessionParseResult =
    | { success: true; session: PersistableAuthSession }
    | { success: false; error: string };

// Explicit result shape keeps auth actions from exposing DB details to the UI.
export type PersistAuthSessionResult =
    | { success: true }
    | { success: false; error: string };

export type RefreshAuthSessionResult = PersistAuthSessionResult;

export type DeactivateAuthSessionResult =
    | { success: true }
    | { success: false; error: string };

// Expired rows are no longer usable even if logout never ran, so mark them
// inactive before any session lifecycle write/read path continues.
async function deactivateExpiredAuthSessions(now = new Date()) {
    await prisma.user_sessions.updateMany({
        where: {
            is_active: true,
            expires_at: {
                lte: now,
            },
        },
        data: {
            is_active: false,
            last_active_at: now,
        },
    });
}

// Derives a non-raw database identifier from the current access token.
// HMAC-SHA256 lets us recognize the same token without storing the token itself.
export function deriveSupabaseSessionId(accessToken: string): string {
    const secret = process.env[SESSION_ID_SECRET];

    // Fail during server-side auth persistence if the deployment has not
    // configured the secret. Storing raw Supabase tokens would be unsafe.
    if (!secret) {
        throw new Error(`${SESSION_ID_SECRET} is required`);
    }

    // Return a 64-character hex string suitable for user_sessions.supabase_session_id.
    return createHmac("sha256", secret)
        .update(accessToken)
        .digest("hex");
}

// Converts Supabase's session object into the exact fields our DB layer needs,
// while preserving a specific server-side reason when required fields are gone.
export function toPersistableAuthSession(session: Session | null): SessionParseResult {
    // Preserve a specific failure reason here so persistAuthSession can log
    // exactly why persistence was skipped.
    if (!session) {
        return { success: false, error: "Missing Supabase session." };
    }

    // access_token identifies the browser/device session for this ticket.
    if (!session.access_token) {
        return { success: false, error: "Missing Supabase access token." };
    }

    // expires_at lets the DB know when this server-side session becomes stale.
    if (!session.expires_at) {
        return { success: false, error: "Missing Supabase session expiry." };
    }

    // user.id maps to player.auth_id before we persist user_sessions.user_id.
    if (!session.user?.id) {
        return { success: false, error: "Missing Supabase user id." };
    }

    // Supabase expires_at is Unix seconds; Prisma/Postgres expects Date values.
    return {
        success: true,
        session: {
            authId: session.user.id,
            expiresAt: new Date(session.expires_at * MILLISECONDS_PER_SECOND),
            supabaseSessionId: deriveSupabaseSessionId(session.access_token),
        },
    };
}

// Writes or refreshes the current Supabase session in our server-side DB table.
export async function persistAuthSession(
    session: Session | null,
): Promise<PersistAuthSessionResult> {
    try {
        const now = new Date();
        await deactivateExpiredAuthSessions(now);

        const parsedSession = toPersistableAuthSession(session);

        // Without a complete Supabase session, there is no stable device/session id
        // to persist for later single-session enforcement or reconnect lookup.
        if (!parsedSession.success) {
            console.error(
                "Auth session persistence skipped:",
                parsedSession.error,
            );
            return { success: false, error: SESSION_PERSISTENCE_ERROR };
        }

        // From this point forward, the session has the token, expiry, and auth
        // user id required to create a user_sessions row.
        const persistableSession = parsedSession.session;

        // Do not reactivate a session that Supabase already considers expired.
        if (persistableSession.expiresAt <= now) {
            console.error("Auth session persistence skipped: session expired.");
            return { success: false, error: SESSION_PERSISTENCE_ERROR };
        }

        // player.auth_id stores the Supabase Auth user UUID; user_sessions.user_id
        // stores the app's player.player_id foreign key.
        const player = await prisma.player.findUnique({
            where: { auth_id: persistableSession.authId },
            select: { player_id: true },
        });

        if (!player) {
            console.error("Auth session persistence failed: player not found.");
            return { success: false, error: SESSION_PERSISTENCE_ERROR };
        }

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
    } catch (error: unknown) {
        // This catches secret misconfiguration, hashing failures, and database
        // errors while still returning the same safe auth-facing message.
        console.error(
            "Auth session persistence failed:",
            error instanceof Error ? error.message : String(error),
        );
        return { success: false, error: SESSION_PERSISTENCE_ERROR };
    }
}

// Refresh uses the same upsert path as login because a refreshed Supabase token
// should reactivate/update the server-side session row with fresh timestamps.
export async function refreshPersistedAuthSession(
    session: Session | null,
): Promise<RefreshAuthSessionResult> {
    // Keep refresh behavior identical to login persistence: if Supabase rotates
    // the token, the derived id changes; otherwise the existing row is updated.
    return persistAuthSession(session);
}

// Marks the current Supabase session inactive when the user logs out.
export async function deactivateAuthSession(
    session: Session | null,
): Promise<DeactivateAuthSessionResult> {
    try {
        const now = new Date();
        await deactivateExpiredAuthSessions(now);

        const parsedSession = toPersistableAuthSession(session);

        // Logout can only update the matching row if Supabase still exposes the
        // current access token before signOut clears the session cookies.
        if (!parsedSession.success) {
            console.error(
                "Auth session deactivation skipped:",
                parsedSession.error,
            );
            return { success: false, error: SESSION_PERSISTENCE_ERROR };
        }

        // Use the same HMAC-derived id as login so we update the exact
        // user_sessions row for this browser/device session.
        await prisma.user_sessions.update({
            where: {
                supabase_session_id: parsedSession.session.supabaseSessionId,
            },
            data: {
                is_active: false,
                last_active_at: now,
            },
        });

        return { success: true };
    } catch (error: unknown) {
        // A missing row or secret misconfiguration should be visible in server
        // logs, but callers still receive a generic persistence error.
        console.error(
            "Auth session deactivation failed:",
            error instanceof Error ? error.message : String(error),
        );
        return { success: false, error: SESSION_PERSISTENCE_ERROR };
    }
}
