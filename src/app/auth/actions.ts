'use server';

import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function signUp(formData: FormData) {
    const supabase = await createServerSideClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;

    if (!email || !password || !username) {
        return { error: 'Please fill in all fields.' };
    }

    // 1. Password Security Check
    // Requires: 8+ chars, at least one uppercase, one lowercase, one number, and one symbol
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(password)) {
        return {
            error: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.'
        };
    }

    // 2. Check if username or email is already taken in the player table
    const existingPlayerByUsername = await prisma.player.findUnique({
        where: { username } as any,
    });

    if (existingPlayerByUsername) {
        return { error: 'Username is already taken.' };
    }

    const existingPlayerByEmail = await prisma.player.findUnique({
        where: { email } as any,
    });

    if (existingPlayerByEmail) {
        return { error: 'This email is already registered and confirmed.' };
    }

    // 3. Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
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
        message: 'An 8-digit verification code has been sent to your email. Please enter it below to finalize your account.'
    };
}

export async function verifyOtp(email: string, token: string, username: string) {
    const supabase = await createServerSideClient();

    // 1. Verify the OTP code with Supabase
    const { data, error: authError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
    });

    if (authError) {
        return { error: authError.message };
    }

    if (!data.user) {
        return { error: 'Verification failed. User session could not be established.' };
    }

    // 2. Finalize registration by creating the player profile
    try {
        const existingPlayer = await prisma.player.findUnique({
            where: { auth_id: data.user.id } as any,
        });

        if (!existingPlayer) {
            await prisma.player.create({
                data: {
                    auth_id: data.user.id,
                    username: username,
                    email: email,
                } as any,
            });
        }

        return { success: true };
    } catch (dbError: any) {
        console.error('Database error during player creation:', dbError.message);
        return { error: 'Verification successful, but profile creation failed. Please contact support.' };
    }
}

export async function signOut() {
    const supabase = await createServerSideClient();
    await supabase.auth.signOut();
    redirect('/');
}
