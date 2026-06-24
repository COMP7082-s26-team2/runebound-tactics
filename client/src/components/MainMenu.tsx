"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Panel } from "@/components/ui/Panel";
import { InviteFriendsModal } from "@/components/lobby/InviteFriendsModal";

export interface MainMenuUser {
    displayName: string;
}

interface MainMenuProps {
    user: MainMenuUser | null;
}

export function MainMenu({ user }: MainMenuProps) {
    const router = useRouter();
    const loggedIn = user !== null;
    const [inviteOpen, setInviteOpen] = useState(false);

    return (
        <main className="relative min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex items-center justify-center overflow-hidden">
            <CartoucheCorner pos="tl" />
            <CartoucheCorner pos="tr" />
            <CartoucheCorner pos="bl" />
            <CartoucheCorner pos="br" />

            {loggedIn && (
                <div className="absolute top-14 right-14">
                    <Panel skin="chamber" className="px-4 py-2 flex flex-col items-end">
                        <Eyebrow className="text-[var(--ink-500)]">Tactician</Eyebrow>
                        <span className="text-[var(--text-sm)] font-bold text-[var(--vellum-050)]">
                            {user.displayName}
                        </span>
                    </Panel>
                </div>
            )}

            <div className="relative z-10 flex flex-col items-center gap-12 px-8">
                <div className="text-center flex flex-col gap-3">
                    <Eyebrow className="text-[var(--brass-500)]">A Tactics Game</Eyebrow>
                    <h1
                        className="text-[7rem] md:text-[9rem] text-[var(--vellum-050)] leading-[0.9] tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Runebound Tactics
                    </h1>
                    <span className="block w-48 h-px mx-auto bg-[var(--brass-500)]" />
                </div>

                <nav className="flex flex-col gap-3 w-64">
                    {loggedIn ? (
                        <>
                            <Button
                                intent="primary"
                                size="lg"
                                onClick={() => router.push("/mode-select")}
                            >
                                Play
                            </Button>
                            <Button
                                intent="secondary"
                                onClick={() => router.push("/profile")}
                            >
                                Profile
                            </Button>
                            <Button
                                intent="secondary"
                                onClick={() => setInviteOpen(true)}
                            >
                                Friends
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                intent="primary"
                                size="lg"
                                onClick={() => router.push("/auth/login")}
                            >
                                Log In
                            </Button>
                            <Button
                                intent="secondary"
                                onClick={() => router.push("/auth/signup")}
                            >
                                Sign Up
                            </Button>
                        </>
                    )}
                </nav>

                {loggedIn && (
                    <form action={signOut}>
                        <button
                            type="submit"
                            className="text-[var(--text-xs)] uppercase tracking-[0.16em] font-[family-name:var(--font-pxcap)] text-[var(--ink-500)] hover:text-[var(--vellum-050)] transition-colors"
                        >
                            Sign Out
                        </button>
                    </form>
                )}
            </div>

            <InviteFriendsModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
        </main>
    );
}

type CornerPos = "tl" | "tr" | "bl" | "br";

function CartoucheCorner({ pos }: { pos: CornerPos }) {
    const base =
        "absolute w-8 h-8 pointer-events-none [image-rendering:pixelated]";
    const positions: Record<CornerPos, string> = {
        tl: "top-4 left-4 border-t-2 border-l-2",
        tr: "top-4 right-4 border-t-2 border-r-2",
        bl: "bottom-4 left-4 border-b-2 border-l-2",
        br: "bottom-4 right-4 border-b-2 border-r-2",
    };
    return (
        <span
            aria-hidden="true"
            className={`${base} ${positions[pos]} border-[var(--brass-500)]`}
        />
    );
}
