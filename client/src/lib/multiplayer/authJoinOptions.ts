import { createClient } from "@/lib/supabase";

export interface AuthenticatedJoinOptions {
    // Supabase access JWT sent to Colyseus so the server can verify the player.
    accessToken: string;
}

// Reads the current Supabase browser session and returns the JWT Colyseus needs
// to verify the player on room join.
export async function getAuthenticatedJoinOptions(): Promise<AuthenticatedJoinOptions> {
    const supabase = createClient();

    // The browser Supabase client owns the current logged-in session; we only
    // read the access token here and pass it directly to the Colyseus join call.
    const {
        data: { session },
    } = await supabase.auth.getSession();

    // Joining multiplayer rooms now requires an authenticated Supabase session.
    // The Colyseus server will perform the authoritative token verification.
    if (!session?.access_token) {
        throw new Error("You must be logged in to join a multiplayer room.");
    }

    return {
        accessToken: session.access_token,
    };
}
