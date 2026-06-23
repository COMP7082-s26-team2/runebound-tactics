"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Panel } from "@/components/ui/Panel";

export function GameModeScreen() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-[var(--ink-900)] text-[var(--ink-300)] flex items-center justify-center p-6">
            <Panel skin="chamber" className="w-full max-w-xl p-10 flex flex-col gap-8">
                <div className="text-center flex flex-col gap-2">
                    <Eyebrow className="text-[var(--brass-500)]">Choose Your Engagement</Eyebrow>
                    <h1 className="text-[var(--text-2xl)] font-bold text-[var(--vellum-050)] leading-tight">
                        Where will you bind your blade?
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                        intent="primary"
                        size="lg"
                        onClick={() => router.push("/game")}
                        className="w-full"
                    >
                        Solo Drills
                    </Button>
                    <Button
                        intent="primary"
                        size="lg"
                        onClick={() => router.push("/multiplayer")}
                        className="w-full"
                    >
                        Live Match
                    </Button>
                </div>

                <div className="flex justify-center">
                    <Button
                        intent="secondary"
                        size="md"
                        onClick={() => router.back()}
                    >
                        Back
                    </Button>
                </div>
            </Panel>
        </main>
    );
}
