import { redirect } from "next/navigation";
import { createServerSideClient } from "@/lib/supabase";
import { UserProfile } from "@/components/profile/UserProfile";

export default async function ProfilePage() {
    const supabase = await createServerSideClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const displayName =
        (user.user_metadata?.username as string | undefined) ??
        user.email ??
        "Tactician";

    return <UserProfile displayName={displayName} email={user.email ?? ""} />;
}
