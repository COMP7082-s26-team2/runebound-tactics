import { useId } from "react";
import { Hint } from "./Hint";

export type FieldSkin = "vellum" | "chamber";

interface FieldProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: "text" | "email" | "password" | "search";
    placeholder?: string;
    error?: string | null;
    autoComplete?: string;
    maxLength?: number;
    disabled?: boolean;
    skin?: FieldSkin;
    className?: string;
}

const SKIN_INPUT: Record<FieldSkin, string> = {
    vellum:
        "bg-[var(--vellum-200)] text-[var(--ink-mark)] placeholder:text-[var(--ink-faded)] [box-shadow:var(--bevel-inset)]",
    chamber:
        "bg-[var(--ink-800)] text-[var(--ink-300)] placeholder:text-[var(--ink-500)] [box-shadow:var(--bevel-chamber)]",
};

const SKIN_LABEL: Record<FieldSkin, string> = {
    vellum: "text-[var(--ink-faded)]",
    chamber: "text-[var(--ink-500)]",
};

export function Field({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    error,
    autoComplete,
    maxLength,
    disabled,
    skin = "vellum",
    className = "",
}: FieldProps) {
    const id = useId();
    const hasError = Boolean(error);
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label
                htmlFor={id}
                className={`text-[var(--text-xs)] uppercase tracking-[0.16em] font-[family-name:var(--font-pxcap)] ${SKIN_LABEL[skin]}`}
            >
                {label}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                maxLength={maxLength}
                disabled={disabled}
                aria-invalid={hasError || undefined}
                aria-describedby={hasError ? `${id}-err` : undefined}
                className={`px-3 py-2 text-[var(--text-sm)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-300)] disabled:opacity-60 ${SKIN_INPUT[skin]} ${hasError ? "[box-shadow:inset_0_0_0_1px_var(--seal-red)]" : ""}`}
            />
            {hasError && (
                <Hint id={`${id}-err`} tone="error">
                    {error}
                </Hint>
            )}
        </div>
    );
}
