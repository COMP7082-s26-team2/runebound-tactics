import { createServerSideClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { persistAuthSession } from "../session-persistence";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in search params, use it as the redirection URL
    const next = searchParams.get("next") ?? "/";

    if (code) {
        console.log("--- Auth Callback Started ---");
        console.log("Code:", code);

        // The callback route is part of the server-side auth flow. It exchanges
        // Supabase's one-time code for a session tied to this request's cookies.
        const supabase = await createServerSideClient();
        const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error(
                "Supabase Auth error during code exchange:",
                error.message,
            );
            // return the user to an error page with instructions
            return NextResponse.redirect(
                `${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`,
            );
        }

        if (data.user) {
            console.log("User session established for:", data.user.email);

            try {
                // Supabase Auth confirms identity, but gameplay uses our player
                // table. Keep the mapping idempotent so callback retries do not
                // create duplicate player profiles.
                const existingPlayer = await prisma.player.findUnique({
                    where: { auth_id: data.user.id },
                });

                if (!existingPlayer) {
                    console.log("Creating new player profile...");
                    // Determine the username. Prioritize the one stored in metadata during signUp.
                    let finalUsername = data.user.user_metadata.username;

                    if (!finalUsername) {
                        // Fallback for OAuth or other flows that might not have a pre-saved username
                        const baseUsername =
                            data.user.user_metadata.full_name ||
                            data.user.user_metadata.username ||
                            data.user.email?.split("@")[0] ||
                            "new_player";
                        finalUsername = `${baseUsername}_${Math.random().toString(36).substring(2, 6)}`;
                    }

                    await prisma.player.create({
                        data: {
                            auth_id: data.user.id,
                            username: finalUsername,
                            email: data.user.email,
                        },
                    });
                    console.log(
                        "Player profile created successfully for:",
                        finalUsername,
                    );
                } else {
                    console.log(
                        "Player profile already exists for:",
                        data.user.email,
                    );
                }

                // The callback can create sessions for OAuth/code flows, so it
                // must also write the matching server-side user_sessions row.
                const persistedSession = await persistAuthSession(data.session);

                // Treat persistence failure as an auth-flow failure because the
                // user would otherwise be logged in without a DB session record.
                if (!persistedSession.success) {
                    console.error(
                        "Auth session persistence failed during callback:",
                        persistedSession.error,
                    );

                    return NextResponse.redirect(
                        `${origin}/auth/auth-code-error?error=${encodeURIComponent("Session could not be saved")}`,
                    );
                }
            } catch (dbError: unknown) {
                console.error(
                    "Database error during player creation:",
                    dbError instanceof Error ? dbError.message : String(dbError),
                );

                // Stop the callback when player creation fails; user_sessions
                // cannot be written without the player foreign key target.
                return NextResponse.redirect(
                    `${origin}/auth/auth-code-error?error=${encodeURIComponent("Player profile could not be saved")}`,
                );
            }

            const forwardedHost = request.headers.get("x-forwarded-host"); // Hello, Vercel
            const isLocalEnv = process.env.NODE_ENV === "development";

            console.log("Redirecting to:", next);
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
    }

    console.warn("Auth callback finished without code or user.");
    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
