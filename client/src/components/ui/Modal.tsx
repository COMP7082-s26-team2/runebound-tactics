"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Panel } from "./Panel";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const previousActiveRef = useRef<HTMLElement | null>(null);
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        previousActiveRef.current = document.activeElement as HTMLElement | null;
        dialogRef.current?.focus();

        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onCloseRef.current();
        }
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("keydown", handleKey);
            previousActiveRef.current?.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink-900)]/70"
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                className="relative max-w-lg w-full mx-4 [box-shadow:var(--elev-pixel-raised)]"
                onClick={(e) => e.stopPropagation()}
            >
                <Panel skin="vellum" className="p-6">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute top-1 right-2 text-[var(--ink-faded)] hover:text-[var(--ink-mark)] text-2xl leading-none"
                    >
                        &times;
                    </button>
                    {title && (
                        <h2 className="text-[var(--text-xl)] font-bold mb-4 text-[var(--ink-mark)]">
                            {title}
                        </h2>
                    )}
                    <div className="modal-content">{children}</div>
                </Panel>
            </div>
        </div>
    );
}
