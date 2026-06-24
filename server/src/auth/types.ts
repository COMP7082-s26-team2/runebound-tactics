import type { Client } from "colyseus";

export interface AuthenticatedJoinOptions {
    // Supabase access JWT sent from the Next client as part of Colyseus join options.
    accessToken?: string;
    // Temporary UI compatibility only; identity must come from the verified token/player row.
    displayName?: string;
}

export interface VerifiedClientAuth {
    // App player id from player.player_id, stringified for Colyseus state/client.auth use.
    userId: string;
    // Supabase Auth user UUID stored in player.auth_id.
    authId: string;
    // Display name from the trusted player row or Supabase fallback metadata.
    username: string;
    email: string | null;
}

export type AuthenticatedClient = Client & {
    auth: VerifiedClientAuth;
};

export function getClientAuth(client: Client): VerifiedClientAuth {
    const auth = client.auth as VerifiedClientAuth | undefined;

    if (!auth?.userId) {
        throw new Error("Client is missing verified auth");
    }

    return auth;
}
