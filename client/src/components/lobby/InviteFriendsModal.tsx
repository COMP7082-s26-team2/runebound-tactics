"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Hint } from "@/components/ui/Hint";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface InviteFriendsModalProps {
    isOpen: boolean;
    onClose: () => void;
    slot?: number;
}

export function InviteFriendsModal({ isOpen, onClose, slot }: InviteFriendsModalProps) {
    const [code, setCode] = useState("");
    const [sent, setSent] = useState(false);

    function reset() {
        setCode("");
        setSent(false);
    }

    function handleClose() {
        reset();
        onClose();
    }

    function handleSend() {
        if (!code.trim()) return;
        setSent(true);
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Send a Summons">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <Eyebrow className="text-[var(--brass-500)]">Choose a Tactician</Eyebrow>
                    {slot !== undefined && (
                        <Hint>Invite will hold slot {slot} for the recipient.</Hint>
                    )}
                </div>

                <Field
                    label="Invite code or username"
                    value={code}
                    onChange={(v) => {
                        setCode(v);
                        setSent(false);
                    }}
                    placeholder="e.g. tactician-1234"
                    maxLength={48}
                    skin="chamber"
                />

                {sent ? (
                    <Hint>
                        Summons drafted. Delivery system is being forged — recipient
                        will receive it when the rune circuit is complete.
                    </Hint>
                ) : (
                    <Hint>Invites expire after 5 minutes.</Hint>
                )}

                <div className="flex gap-2 justify-end">
                    <Button intent="secondary" size="md" onClick={handleClose}>
                        Close
                    </Button>
                    <Button
                        intent="primary"
                        size="md"
                        onClick={handleSend}
                        disabled={!code.trim() || sent}
                    >
                        {sent ? "Sent" : "Send"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
