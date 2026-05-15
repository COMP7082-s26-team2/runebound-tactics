import { createServerSideClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in search params, use it as the redirection URL
    const next = searchParams.get('next') ?? '/';

    if (code) {
        console.log('--- Auth Callback Started ---');
        console.log('Code:', code);

        const supabase = await createServerSideClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Supabase Auth error during code exchange:', error.message);
            // return the user to an error page with instructions
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`);
        }

        if (data.user) {
            console.log('User session established for:', data.user.email);

            try {
                // Check if player profile already exists
                const existingPlayer = await prisma.player.findUnique({
                    where: { auth_id: data.user.id } as any,
                });

                if (!existingPlayer) {
                    console.log('Creating new player profile...');
                    // Determine the username. Prioritize the one stored in metadata during signUp.
                    let finalUsername = data.user.user_metadata.username;

                    if (!finalUsername) {
                        // Fallback for OAuth or other flows that might not have a pre-saved username
                        const baseUsername = data.user.user_metadata.full_name ||
                            data.user.user_metadata.username ||
                            data.user.email?.split('@')[0] ||
                            'new_player';
                        finalUsername = `${baseUsername}_${Math.random().toString(36).substring(2, 6)}`;
                    }

                    await prisma.player.create({
                        data: {
                            auth_id: data.user.id,
                            username: finalUsername,
                            email: data.user.email,
                        } as any,
                    });
                    console.log('Player profile created successfully for:', finalUsername);
                } else {
                    console.log('Player profile already exists for:', data.user.email);
                }
            } catch (dbError: any) {
                console.error('Database error during player creation:', dbError.message);
            }

            const forwardedHost = request.headers.get('x-forwarded-host'); // Hello, Vercel
            const isLocalEnv = process.env.NODE_ENV === 'development';

            console.log('Redirecting to:', next);
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
    }

    console.warn('Auth callback finished without code or user.');
    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
