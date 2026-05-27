import { GridMovementCanvas } from "@/components/";

export default function Page() {
    return (
        <main className="flex flex-row flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <GridMovementCanvas debug={true} />
            <div className="w-8" />
            <GridMovementCanvas debug={true} />
        </main>
    );
}
