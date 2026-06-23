"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Stat } from "@/components/ui/Stat";
import { Numeric } from "@/components/ui/Numeric";
import { Hint } from "@/components/ui/Hint";
import { Sigil } from "@/components/ui/Sigil";
import { FactionBadge } from "@/components/ui/FactionBadge";
import { Divider } from "@/components/ui/Divider";
import { Field } from "@/components/ui/Field";

if (process.env.NODE_ENV === "production") {
    notFound();
}

export default function DesignSystemShowcase() {
    const [modalOpen, setModalOpen] = useState(false);
    const [fieldValue, setFieldValue] = useState("");
    const [errorFieldValue, setErrorFieldValue] = useState("typo");

    return (
        <main className="min-h-screen bg-[var(--ink-900)] p-8 text-[var(--ink-300)]">
            <div className="max-w-5xl mx-auto flex flex-col gap-12">
                <header className="flex flex-col gap-2">
                    <Eyebrow className="text-[var(--brass-500)]">UI Design System</Eyebrow>
                    <h1 className="text-[var(--text-2xl)] font-[family-name:var(--font-display)] text-[var(--vellum-050)]">
                        Primitive showcase
                    </h1>
                    <Hint>Dev-only. Returns 404 in production builds.</Hint>
                </header>

                <Section title="Panel">
                    <div className="grid grid-cols-2 gap-4">
                        <Panel skin="vellum" className="p-4">
                            <Eyebrow className="text-[var(--ink-faded)]">Vellum skin</Eyebrow>
                            <p className="text-[var(--text-sm)] mt-2">Warm manual surface.</p>
                        </Panel>
                        <Panel skin="chamber" className="p-4">
                            <Eyebrow className="text-[var(--ink-500)]">Chamber skin</Eyebrow>
                            <p className="text-[var(--text-sm)] mt-2">Cool inset surround.</p>
                        </Panel>
                        <Panel
                            skin="vellum"
                            className="p-4"
                            sigil={<Sigil faction="castle" size={20} state="active" />}
                        >
                            <Eyebrow className="text-[var(--ink-faded)]">With sigil corner (active)</Eyebrow>
                        </Panel>
                        <Panel
                            skin="chamber"
                            className="p-4"
                            sigil={<Sigil faction="necropolis" size={20} state="stamped" />}
                            sigilSide="right"
                        >
                            <Eyebrow className="text-[var(--ink-500)]">Sigil right (stamped)</Eyebrow>
                        </Panel>
                    </div>
                </Section>

                <Section title="Button">
                    <div className="flex flex-wrap gap-3 items-center">
                        <Button intent="primary">Primary md</Button>
                        <Button intent="secondary">Secondary md</Button>
                        <Button intent="destructive">Destructive md</Button>
                        <Button intent="primary" size="sm">Primary sm</Button>
                        <Button intent="primary" disabled>Primary disabled</Button>
                    </div>
                </Section>

                <Section title="Modal">
                    <Button intent="primary" onClick={() => setModalOpen(true)}>
                        Open modal
                    </Button>
                    <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Modal title">
                        <p className="text-[var(--text-sm)]">
                            Centered vellum panel with backdrop, projected pixel shadow,
                            Esc to close, click outside to close.
                        </p>
                    </Modal>
                </Section>

                <Section title="Type primitives">
                    <div className="flex flex-col gap-3">
                        <Eyebrow className="text-[var(--ink-faded)]">Eyebrow — Tiny5 pixel-cap</Eyebrow>
                        <Numeric size="xl" tone="brass">99</Numeric>
                        <Numeric size="lg">100 / 100</Numeric>
                        <Numeric size="md" tone="faded">3:42</Numeric>
                        <Hint>Default hint tone</Hint>
                        <Hint tone="error">Error hint tone</Hint>
                    </div>
                </Section>

                <Section title="Stat">
                    <Panel skin="vellum" className="p-4 max-w-sm flex flex-col gap-2">
                        <Stat
                            label={<Eyebrow className="text-[var(--ink-faded)]">HP</Eyebrow>}
                            value={<Numeric>120</Numeric>}
                        />
                        <Stat
                            label={<Eyebrow className="text-[var(--ink-faded)]">ATK</Eyebrow>}
                            value={<Numeric>18</Numeric>}
                            delta="up"
                        />
                        <Stat
                            label={<Eyebrow className="text-[var(--ink-faded)]">DEF</Eyebrow>}
                            value={<Numeric>9</Numeric>}
                            delta="down"
                        />
                    </Panel>
                </Section>

                <Section title="Sigil — sizes × states">
                    <div className="grid grid-cols-4 gap-3 max-w-md">
                        {([12, 20, 28, 64] as const).map((size) => (
                            <div key={size} className="flex flex-col items-center gap-1">
                                <Sigil faction="castle" size={size} state="idle" />
                                <Sigil faction="castle" size={size} state="active" />
                                <Sigil faction="necropolis" size={size} state="idle" />
                                <Sigil faction="necropolis" size={size} state="active" />
                                <Hint>{size}px</Hint>
                            </div>
                        ))}
                    </div>
                </Section>

                <Section title="FactionBadge">
                    <div className="flex gap-3">
                        <FactionBadge faction="castle" size="sm" />
                        <FactionBadge faction="castle" size="md" />
                        <FactionBadge faction="necropolis" size="sm" />
                        <FactionBadge faction="necropolis" size="md" label="Necropolis (custom label)" />
                    </div>
                </Section>

                <Section title="Divider">
                    <Panel skin="vellum" className="p-4 max-w-md flex flex-col gap-2">
                        <p className="text-[var(--text-sm)]">Plain divider below:</p>
                        <Divider />
                        <p className="text-[var(--text-sm)]">With ornament:</p>
                        <Divider ornament="◆" />
                        <p className="text-[var(--text-sm)]">Chamber tone:</p>
                        <Divider tone="chamber" />
                    </Panel>
                </Section>

                <Section title="Field">
                    <Panel skin="vellum" className="p-4 max-w-md flex flex-col gap-3">
                        <Field
                            label="Display name"
                            value={fieldValue}
                            onChange={setFieldValue}
                            placeholder="e.g. Tyche"
                        />
                        <Field
                            label="Invite code"
                            value={errorFieldValue}
                            onChange={setErrorFieldValue}
                            error={errorFieldValue ? "Code not recognized" : null}
                        />
                        <Field
                            label="Search"
                            value=""
                            onChange={() => {}}
                            type="search"
                            placeholder="Find a lobby"
                            skin="chamber"
                        />
                    </Panel>
                </Section>
            </div>
        </main>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
                <h2 className="text-[var(--text-lg)] font-[family-name:var(--font-display)] text-[var(--vellum-050)]">
                    {title}
                </h2>
                <Divider tone="chamber" className="flex-1" />
            </div>
            {children}
        </section>
    );
}
