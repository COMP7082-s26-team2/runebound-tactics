import { Suspense } from "react";
import { GamePageContent } from "./GamePageContent";

export default function Page() {
    return (
        <Suspense>
            <GamePageContent />
        </Suspense>
    );
}
