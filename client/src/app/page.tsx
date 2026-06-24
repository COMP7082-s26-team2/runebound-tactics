import { MainMenu } from "@/components/MainMenu";
import { createServerSideClient } from "@/lib/supabase";

export default async function Home() {
    const supabase = await createServerSideClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const displayName =
        (user?.user_metadata?.username as string | undefined) ??
        user?.email ??
        null;

    return <MainMenu user={displayName ? { displayName } : null} />;
}
