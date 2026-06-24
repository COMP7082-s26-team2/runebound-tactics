"use client";

import { type ReactNode, useSyncExternalStore } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

function subscribe() {
    return () => {};
}

function getServerSnapshot() {
    return false;
}

function getSnapshot() {
    return true;
}

export function ClientOnly({ children, fallback = null }: Props) {
    const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    if (!mounted) return <>{fallback}</>;
    return <>{children}</>;
}
