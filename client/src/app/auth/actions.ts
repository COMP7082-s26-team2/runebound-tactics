"use server";

import { createServerSideClient } from "@/lib/supabase";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
    // Request-scoped singleton: reused during this server request while keeping
    // each user's cookies/JWT isolated from other requests.
    const supabase = await createServerSideClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const username = formData.get("username") as string;

    if (!email || !password || !username) {
        return { error: "Please fill in all fields." };
    }

    // 1. Password Security Check
    // Requires: 8+ chars, at least one uppercase, one lowercase, one number, and one symbol
    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(password)) {
        return {
            error: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.",
        };
    }

    // 2. Check if username or email is already taken in the player table
    const existingPlayerByUsername = await prisma.player.findUnique({
        where: { username },
    });

    if (existingPlayerByUsername) {
        return { error: "Username is already taken." };
    }

    const existingPlayerByEmail = await prisma.player.findUnique({
        where: { email },
    });

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

    if (authError) {
        return { error: authError.message };
    }

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

        if (!existingPlayer) {
            await prisma.player.create({
                data: {
                    auth_id: data.user.id,
                    username: username,
                    email: email,
                },
            });
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
    await supabase.auth.signOut();
    redirect("/");
}

export async function logIn(formData: FormData) {
    // Login reuses the request-scoped singleton. It behaves like a singleton for
    // this request without sharing auth cookies across different users.
    const supabase = await createServerSideClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Please fill in all fields." };
    }

    // Supabase Auth owns password verification and session creation. The app
    // only receives success/error state and never handles password hashes.
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}
