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

    // 1. Check if username is already taken in the player table
    const existingPlayer = await prisma.player.findUnique({
        where: { username } as any,
    });

    if (existingPlayer) {
        return { error: 'Username is already taken.' };
    }

    // 2. Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username,
            },
        },
    });

    if (error) {
        return { error: error.message };
    }

    if (data.user) {
        // 3. Create player record in our DB
        // Note: If email verification is required, the user is technically created in Supabase Auth,
        // but may not be "active". We create the player record now to reserve the username.
        try {
            await prisma.player.create({
                data: {
                    username: username,
                    auth_id: data.user.id,
                } as any,
            });
        } catch (e) {
            console.error('Error creating player record:', e);
            return { error: 'Failed to create player profile. Please try again.' };
        }
    }

    return { success: true, message: 'Registration successful! Please check your email for verification.' };
}

export async function signInWithProvider(provider: 'google' | 'github' | 'azure') {
    const supabase = await createServerSideClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    if (data.url) {
        redirect(data.url);
    }
}

export async function signInAsGuest() {
    const supabase = await createServerSideClient();

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
        return { error: error.message };
    }

    if (data.user) {
        // Generate a temporary username for the guest
        const tempUsername = `guest_${Math.random().toString(36).substring(2, 9)}`;

        await prisma.player.create({
            data: {
                username: tempUsername,
                auth_id: data.user.id,
            } as any,
        });

        return { success: true, user: data.user };
    }
}

export async function signInWithGoogle() {
    await signInWithProvider('google');
}

export async function signInWithGithub() {
    await signInWithProvider('github');
}

export async function signInWithAzure() {
    await signInWithProvider('azure');
}

export async function signInAsGuestForm() {
    await signInAsGuest();
}

export async function signOut() {
    const supabase = await createServerSideClient();
    await supabase.auth.signOut();
    redirect('/');
}
