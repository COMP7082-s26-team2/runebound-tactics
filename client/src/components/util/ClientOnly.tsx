"use client";

import { useEffect, useState, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

export function ClientOnly({ children, fallback = null }: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return <>{fallback}</>;
    return <>{children}</>;
}
