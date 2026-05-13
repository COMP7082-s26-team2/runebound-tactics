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

    // 2. Check if username is already taken in the player table
    const existingPlayer = await prisma.player.findUnique({
        where: { username } as any,
    });

    if (existingPlayer) {
        return { error: 'Username is already taken.' };
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

    // NOTE: We no longer create the player record immediately. 
    // The player record will be created in the auth/callback route 
    // ONLY after the user verifies their email.

    return {
        success: true,
        message: 'A verification email has been sent. Please confirm your email to finalize your account registration.'
    };
}

export async function signOut() {
    const supabase = await createServerSideClient();
    await supabase.auth.signOut();
    redirect('/');
}
