"use server";

import { createServerSideClient } from "@/lib/supabase";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
    deactivateAuthSession,
    persistAuthSession,
    refreshPersistedAuthSession,
} from "./session-persistence";

export async function signUp(formData: FormData) {
    // Request-scoped singleton: reused during this server request while keeping
    // each user's cookies/JWT isolated from other requests.
    const supabase = await createServerSideClient();

    // Pull the signup credentials from the submitted form before doing any
    // Supabase or database work.
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const username = formData.get("username") as string;

    // All three fields are required to create both the Supabase auth user and
    // the app-level player profile.
    if (!email || !password || !username) {
        return { error: "Please fill in all fields." };
    }

    // 1. Password Security Check
    // Requires: 8+ chars, at least one uppercase, one lowercase, one number, and one symbol
    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    // Reject weak passwords before making a Supabase request so the user gets
    // immediate, consistent validation feedback.
    if (!passwordRegex.test(password)) {
        return {
            error: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.",
        };
    }

    // 2. Check if username or email is already taken in the player table
    const existingPlayerByUsername = await prisma.player.findUnique({
        where: { username },
    });

    // Username is app-owned data, so we check our player table before signup.
    if (existingPlayerByUsername) {
        return { error: "Username is already taken." };
    }

    const existingPlayerByEmail = await prisma.player.findUnique({
        where: { email },
    });

    // Prevent duplicate confirmed player records for the same email.
    if (existingPlayerByEmail) {
        return { error: "This email is already registered and confirmed." };
    }

    // 3. Delegate credential creation and email verification to Supabase Auth.
    // The app stores only game/profile data; Supabase owns passwords, auth
    // users, verification emails, and session creation.
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username,
            },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    });

    // Supabase owns auth failures such as duplicate auth users or invalid
    // credential policy responses.
    if (error) {
        return { error: error.message };
    }

    return {
        success: true,
        message:
            "An 8-digit verification code has been sent to your email. Please enter it below to finalize your account.",
    };
}

export async function verifyOtp(
    email: string,
    token: string,
    username: string,
) {
    // Uses the current request-scoped singleton while completing the signup
    // verification flow.
    const supabase = await createServerSideClient();

    // 1. Verify the OTP code with Supabase. A successful response gives us the
    // Supabase user id that links auth identity to the app's player profile.
    const { data, error: authError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
    });

    // Stop immediately if Supabase rejects or cannot verify the OTP code.
    if (authError) {
        return { error: authError.message };
    }

    // A verified OTP should return the auth user; without it we cannot link the
    // player profile to Supabase Auth.
    if (!data.user) {
        return {
            error: "Verification failed. User session could not be established.",
        };
    }

    // 2. Finalize registration by creating the player profile. This keeps
    // application-specific player data separate from Supabase Auth credentials.
    try {
        const existingPlayer = await prisma.player.findUnique({
            where: { auth_id: data.user.id },
        });

        // OTP verification can be retried, so only create the player profile
        // when it does not already exist for this Supabase auth id.
        if (!existingPlayer) {
            await prisma.player.create({
                data: {
                    auth_id: data.user.id,
                    username: username,
                    email: email,
                },
            });
        }

        // Persist only after the player profile exists because user_sessions
        // references player.player_id through user_id.
        const persistedSession = await persistAuthSession(data.session);

        // If the session row cannot be written, the signup auth flow completed
        if (!persistedSession.success) {
            console.error(
                "Auth session persistence failed during OTP verification:",
                persistedSession.error,
            );

            return {
                error: "Verification succeeded, but the session could not be saved. Please try logging in.",
            };
        }

        return { success: true };
    } catch (dbError: unknown) {
        console.error(
            "Database error during player creation:",
            dbError instanceof Error ? dbError.message : String(dbError),
        );
        return {
            error: "Verification successful, but profile creation failed. Please contact support.",
        };
    }
}

export async function signOut() {
    // Sign out uses the request-scoped singleton so Supabase clears the correct
    // user's auth cookies.
    const supabase = await createServerSideClient();

    // Read the current session before Supabase clears it so we can derive the
    // same hashed session id that was stored during login.
    const { data } = await supabase.auth.getSession();
    const deactivatedSession = await deactivateAuthSession(data.session);

    // Logout should continue even if DB deactivation fails, but the server log
    if (!deactivatedSession.success) {
        console.error(
            "Auth session deactivation failed during logout:",
            deactivatedSession.error,
        );
    }

    await supabase.auth.signOut();
    redirect("/");
}

export async function refreshAuthSessionRecord() {
    // Keep refresh server-owned: the client triggers this action, but the server
    // reads the trusted Supabase cookies and updates user_sessions.
    const supabase = await createServerSideClient();

    // getSession may refresh Supabase cookies through the server client; the
    // returned session is the only input needed for DB session persistence.
    const { data } = await supabase.auth.getSession();

    const refreshedSession = await refreshPersistedAuthSession(data.session);

    // Return a controlled error so client callers can log/handle the failure
    // without learning token, secret, or database details.
    if (!refreshedSession.success) {
        console.error(
            "Auth session refresh persistence failed:",
            refreshedSession.error,
        );

        return {
            error: "Session could not be refreshed.",
        };
    }

    return { success: true };
}

export async function logIn(formData: FormData) {
    // Login reuses the request-scoped singleton. It behaves like a singleton for
    // this request without sharing auth cookies across different users.
    const supabase = await createServerSideClient();

    // Login needs only the credentials Supabase uses to create a session.
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Avoid calling Supabase when the form submission is incomplete.
    if (!email || !password) {
        return { error: "Please fill in all fields." };
    }

    // Supabase Auth owns password verification and session creation. The app
    // only receives success/error state and never handles password hashes.
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    // Invalid credentials, disabled users, and other auth-level login failures
    // are returned directly from Supabase.
    if (error) {
        return { error: error.message };
    }

    const persistedSession = await persistAuthSession(data.session);

    // BCOMP-165 requires server-side session persistence, so login should not
    // report success if the user_sessions row could not be written.
    if (!persistedSession.success) {
        console.error(
            "Auth session persistence failed during login:",
            persistedSession.error,
        );

        return {
            error: "Login succeeded, but the session could not be saved. Please try again.",
        };
    }

    return { success: true };
}
