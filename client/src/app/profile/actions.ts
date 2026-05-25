'use server';

import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const BUCKET_NAME = 'profile-pictures';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Authenticates the current user via supabase.auth.getUser().
 * getUser() contacts the Supabase Auth server to verify the JWT,
 * unlike getSession() which reads unverified data from cookies.
 */
async function getAuthenticatedUser() {
    const supabase = await createServerSideClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { supabase, user: null };
    }

    return { supabase, user };
}

/**
 * Fetches the current authenticated user's profile from the player table.
 * Returns username, email, and avatar_url.
 */
export async function getProfile() {
    const { user } = await getAuthenticatedUser();

    if (!user) {
        return { error: 'Not authenticated.' };
    }

    const player = await prisma.player.findUnique({
        where: { auth_id: user.id } satisfies Prisma.playerWhereUniqueInput,
        select: {
            player_id: true,
            username: true,
            email: true,
            avatar_url: true,
        },
    });

    if (!player) {
        return { error: 'Player profile not found.' };
    }

    return {
        success: true,
        profile: {
            player_id: player.player_id,
            username: player.username,
            email: player.email,
            avatar_url: player.avatar_url,
        },
    };
}

/**
 * Updates the authenticated user's username.
 * Validates uniqueness and updates both the player table and Supabase Auth metadata.
 */
export async function updateUsername(newUsername: string) {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
        return { error: 'Not authenticated.' };
    }

    if (!newUsername || newUsername.trim().length === 0) {
        return { error: 'Username cannot be empty.' };
    }

    const trimmed = newUsername.trim();

    // Check uniqueness
    const existing = await prisma.player.findUnique({
        where: { username: trimmed } satisfies Prisma.playerWhereUniqueInput,
    });

    if (existing && String(existing.auth_id) !== user.id) {
        return { error: 'Username is already taken.' };
    }

    // Update player table
    await prisma.player.update({
        where: { auth_id: user.id } satisfies Prisma.playerWhereUniqueInput,
        data: { username: trimmed } satisfies Prisma.playerUpdateInput,
    });

    // Update Supabase Auth metadata
    await supabase.auth.updateUser({
        data: { username: trimmed },
    });

    return { success: true };
}

/**
 * Uploads a profile picture to Supabase Storage and saves the public URL.
 * Validates file type (png/jpeg/webp) and size (≤2MB).
 */
export async function uploadAvatar(formData: FormData) {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
        return { error: 'Not authenticated.' };
    }

    const file = formData.get('avatar') as File;

    if (!file || !(file instanceof File)) {
        return { error: 'No file provided.' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { error: 'Invalid file type. Allowed: PNG, JPEG, WebP.' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return { error: 'File too large. Maximum size is 2MB.' };
    }

    // Determine file extension
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const filePath = `${user.id}/avatar.${ext}`;

    // Upload to Supabase Storage (upsert to overwrite existing)
    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (uploadError) {
        console.error('[PROFILE] Upload error:', uploadError.message);
        return { error: 'Failed to upload image. Please try again.' };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Save URL to player record
    await prisma.player.update({
        where: { auth_id: user.id } satisfies Prisma.playerWhereUniqueInput,
        data: { avatar_url: publicUrl } satisfies Prisma.playerUpdateInput,
    });

    return { success: true, avatar_url: publicUrl };
}

/**
 * Verifies the player's current password by performing a signIn check via Supabase Auth.
 */
export async function verifyCurrentPassword(currentPassword: string) {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user || !user.email) {
        return { error: 'Not authenticated.' };
    }

    if (!currentPassword) {
        return { error: 'Current password is required.' };
    }

    // Try signing in with the user's email and current password to verify it.
    const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    });

    if (error) {
        return { error: 'Incorrect current password.' };
    }

    return { success: true };
}

/**
 * Updates the user's password in Supabase Auth.
 * Validates complexity first.
 */
export async function updatePassword(newPassword: string) {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
        return { error: 'Not authenticated.' };
    }

    if (!newPassword) {
        return { error: 'New password is required.' };
    }

    // Password Security Check: 8+ chars, at least one uppercase, one lowercase, one number, and one symbol
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        return {
            error: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.'
        };
    }

    // Update the password
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

