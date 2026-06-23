"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface MainMenuProps {
    onInviteFriend?: () => void;
}

export function MainMenu({ onInviteFriend }: MainMenuProps) {
    const router = useRouter();

    return (
        <main className="relative min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex items-center justify-center overflow-hidden">
            <CartoucheCorner pos="tl" />
            <CartoucheCorner pos="tr" />
            <CartoucheCorner pos="bl" />
            <CartoucheCorner pos="br" />

            <div className="absolute top-6 right-6">
                <Button
                    intent="secondary"
                    size="sm"
                    onClick={onInviteFriend}
                    disabled={!onInviteFriend}
                >
                    Invite a Friend
                </Button>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-12 px-8">
                <div className="text-center flex flex-col gap-3">
                    <Eyebrow className="text-[var(--brass-500)]">A Tactics Game</Eyebrow>
                    <h1
                        className="text-[var(--text-3xl)] text-[var(--vellum-050)] leading-none"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Runebound Tactics
                    </h1>
                    <span className="block w-32 h-px mx-auto bg-[var(--brass-500)]" />
                </div>

                <nav className="flex flex-col gap-3 w-64">
                    <Button intent="primary" onClick={() => router.push("/mode-select")}>
                        Start Game
                    </Button>
                    <Button intent="secondary" onClick={() => router.push("/auth/login")}>
                        Log In
                    </Button>
                    <Button
                        intent="destructive"
                        onClick={() => {
                            if (typeof window !== "undefined") {
                                window.close();
                            }
                        }}
                    >
                        Quit
                    </Button>
                </nav>
            </div>
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
