"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

function MenuPage() {
    const router = useRouter();
    const handleMultiplayer = () => {
        console.log(`Button Clicked`);
        router.push("/multiplayer", {});
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <Button onClick={handleMultiplayer}>Multiplayer</Button>
        </div>
    );
}

export default MenuPage;
