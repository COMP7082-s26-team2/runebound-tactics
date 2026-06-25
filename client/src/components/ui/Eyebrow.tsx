import type { ReactNode } from "react";

interface EyebrowProps {
    children: ReactNode;
    className?: string;
}

export function Eyebrow({ children, className = "" }: EyebrowProps) {
    return (
        <span
            className={`inline-block text-[var(--text-2xs)] uppercase tracking-[0.16em] font-[family-name:var(--font-pxcap)] ${className}`}
        >
            {children}
        </span>
    );
}
