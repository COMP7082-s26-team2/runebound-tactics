import type { ReactNode } from "react";

export type ButtonIntent = "primary" | "secondary" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
    intent?: ButtonIntent;
    size?: ButtonSize;
    type?: "button" | "submit";
    disabled?: boolean;
    onClick?: () => void;
    children: ReactNode;
    className?: string;
}

const INTENT_CLASSES: Record<ButtonIntent, string> = {
    primary:
        "bg-[var(--brass-300)] text-black font-bold border-2 border-[var(--brass-700)] hover:bg-[var(--brass-500)] active:translate-y-px disabled:bg-[var(--ink-700)] disabled:text-[var(--ink-500)] disabled:border-[var(--ink-500)]",
    secondary:
        "bg-transparent text-[var(--brass-300)] font-bold border-2 border-[var(--brass-500)] hover:bg-[var(--brass-500)] hover:text-[var(--ink-900)] active:translate-y-px disabled:opacity-50",
    destructive:
        "bg-[var(--seal-red)] text-[var(--vellum-050)] font-bold hover:brightness-110 active:translate-y-px disabled:opacity-50 [box-shadow:var(--bevel-chamber)]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: "px-3 py-1 text-[var(--text-xs)]",
    md: "px-4 py-2 text-[var(--text-sm)]",
    lg: "px-6 py-3 text-[var(--text-md)]",
};

const BASE =
    "inline-flex items-center justify-center font-medium tracking-wide " +
    "transition-colors duration-150 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-300)] " +
    "disabled:cursor-not-allowed";

export function Button({
    intent = "primary",
    size = "md",
    type = "button",
    disabled,
    onClick,
    children,
    className = "",
}: ButtonProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${BASE} ${INTENT_CLASSES[intent]} ${SIZE_CLASSES[size]} ${className}`}
        >
            {children}
        </button>
    );
}
