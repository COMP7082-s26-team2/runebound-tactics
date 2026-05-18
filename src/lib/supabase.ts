import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Client-side Supabase client
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

/**
 * Server-side Supabase client (for Server Actions and API Routes)
 */
export async function createServerSideClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}

/**
 * Programmatically checks if the physical Supabase access token inside cookies has expired.
 * If expired, it purges all auth cookies to guarantee immediate sign-out without relying on silent refresh.
 */
export async function assertTokenNotExpired(): Promise<boolean> {
    const cookieStore = await cookies();
    const authCookie = cookieStore.getAll().find(
        (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

    if (!authCookie || !authCookie.value) {
        return false; // No session, let standard getSession() handle redirect
    }

    try {
        const rawValue = authCookie.value;

        // If the URL-encoded payload starts with base64-, decode the JSON value
        if (rawValue.startsWith('base64-')) {
            const base64Str = rawValue.substring(7);
            const decodedStr = Buffer.from(base64Str, 'base64').toString('utf-8');
            const payload = JSON.parse(decodedStr);
            const expiresAt = payload.expires_at; // Unix timestamp in seconds

            if (expiresAt && Date.now() / 1000 > expiresAt) {
                // EXPIRED! Clean all cookies and enforce logout
                console.log(`[AUTH GUARD] Access token has expired (expires_at: ${expiresAt}). Evicting session.`);

                // Fetch all auth cookies and delete them from the client
                cookieStore.getAll()
                    .filter((c) => c.name.startsWith('sb-'))
                    .forEach((c) => {
                        // Options must match standard Supabase cookie settings to trigger removal
                        cookieStore.set(c.name, '', { maxAge: -1, path: '/' });
                    });

                return true; // Token has strictly expired
            }
        }
    } catch (e: any) {
        console.error('[AUTH GUARD] Error parsing session expiration:', e.message);
    }

    return false;
}
