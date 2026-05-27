interface ButtonProps {
    type?: "primary" | "secondary" | "danger";
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
}

export function Button({
    type = "primary",
    children,
    onClick,
    disabled,
}: ButtonProps) {
    const baseStyles = "px-4 py-2 rounded font-semibold transition-colors";

    const typeStyles = {
        primary:
            "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400",
        secondary:
            "bg-gray-300 text-gray-800 hover:bg-gray-400 disabled:bg-gray-200",
        danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400",
    };

    return (
        <button
            className={`${baseStyles} ${typeStyles[type]}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
