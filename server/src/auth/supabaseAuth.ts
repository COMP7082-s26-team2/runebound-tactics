import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { prisma } from "../database/prisma";
import type { AuthenticatedJoinOptions, VerifiedClientAuth } from "./types";

export class AuthJoinError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AuthJoinError";
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The Colyseus process verifies JWTs directly with Supabase Auth, so it needs
// the same project URL/key used by the Next app. These are not service-role DB credentials.
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for Colyseus auth",
    );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // This server only validates tokens passed in join options; it should
        // never persist or refresh browser sessions of its own.
        persistSession: false,
        autoRefreshToken: false,
    },
});

export async function verifySupabaseJoinAuth(
    options?: AuthenticatedJoinOptions,
): Promise<VerifiedClientAuth> {
    const accessToken = options?.accessToken;

    if (!accessToken) {
        throw new AuthJoinError("Missing Supabase access token");
    }

    // getUser(accessToken) asks Supabase Auth to validate the JWT server-side,
    // including signature and expiry, instead of trusting client-supplied data.
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
        throw new AuthJoinError("Invalid or expired Supabase access token");
    }

    // Gameplay uses the app's player identity, so the verified Supabase auth id
    // must resolve to an existing player row before a room join is accepted.
    const player = await prisma.player.findUnique({
        where: {
            auth_id: data.user.id,
        },
        select: {
            player_id: true,
            auth_id: true,
            username: true,
            email: true,
        },
    });

    if (!player?.auth_id) {
        throw new AuthJoinError("Player profile not found for authenticated user");
    }

    return {
        userId: player.player_id.toString(),
        authId: player.auth_id,
        // Prefer the application username because client-provided displayName
        // is not trusted identity data.
        username:
            player.username ??
            data.user.user_metadata?.username ??
            data.user.email ??
            "Player",
        email: player.email ?? data.user.email ?? null,
    };
}
