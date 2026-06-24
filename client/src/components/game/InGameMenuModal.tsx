"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Divider } from "@/components/ui/Divider";
import { Hint } from "@/components/ui/Hint";

interface InGameMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLeave: () => void;
}

type ThemeChoice = "dark" | "light";
type SoundChoice = "on" | "off";

export function InGameMenuModal({ isOpen, onClose, onLeave }: InGameMenuModalProps) {
    const [theme, setTheme] = useState<ThemeChoice>("dark");
    const [sound, setSound] = useState<SoundChoice>("on");

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Match Menu">
            <div className="flex flex-col gap-5">
                <section className="flex flex-col gap-3">
                    <Eyebrow className="text-[var(--brass-500)]">Settings</Eyebrow>

                    <SettingRow label="Theme">
                        <ToggleButton active={theme === "dark"} onClick={() => setTheme("dark")}>
                            Dark
                        </ToggleButton>
                        <ToggleButton active={theme === "light"} onClick={() => setTheme("light")} disabled>
                            Light
                        </ToggleButton>
                    </SettingRow>
                    <Hint>Light mode is coming. The realm is dark for now.</Hint>

                    <SettingRow label="Sound effects">
                        <ToggleButton active={sound === "on"} onClick={() => setSound("on")}>
                            On
                        </ToggleButton>
                        <ToggleButton active={sound === "off"} onClick={() => setSound("off")}>
                            Off
                        </ToggleButton>
                    </SettingRow>
                </section>

                <Divider tone="chamber" ornament={<span className="text-[var(--brass-500)]">◆</span>} />

                <section className="flex flex-col gap-3">
                    <Eyebrow className="text-[var(--brass-500)]">Match</Eyebrow>
                    <Button intent="destructive" size="md" disabled className="w-full">
                        Concede Match
                    </Button>
                    <Button intent="destructive" size="md" onClick={onLeave} className="w-full">
                        Leave Match
                    </Button>
                </section>

                <div className="flex justify-end">
                    <Button intent="secondary" size="md" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <Eyebrow className="text-[var(--ink-500)]">{label}</Eyebrow>
            <div className="flex gap-2">{children}</div>
        </div>
    );
}

function ToggleButton({
    active,
    onClick,
    disabled,
    children,
}: {
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            className={`px-4 py-2 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-300)] ${
                active
                    ? "bg-[var(--brass-300)] text-black border-2 border-[var(--brass-700)]"
                    : "bg-transparent text-[var(--brass-300)] border-2 border-[var(--brass-500)] hover:bg-[var(--brass-500)] hover:text-[var(--ink-900)]"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
            {children}
        </button>
    );
}
