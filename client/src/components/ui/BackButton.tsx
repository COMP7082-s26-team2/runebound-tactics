
import { Button } from "./Button";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    router: AppRouterInstance;
}

export function BackButton({ children, router }: ButtonProps) {
    const handleBack = () => {
        // window.history.back();
        router.back();
    };
    return <Button onClick={handleBack}>{children}</Button>;
}
