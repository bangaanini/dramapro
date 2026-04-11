import { redirect } from "next/navigation";

import { ProfileOverview } from "@/components/profile-overview";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/profile");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <ProfileOverview
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          authProvider: user.authProvider,
          telegramUsername: user.telegramUsername,
          telegramPhotoUrl: user.telegramPhotoUrl,
          vipStartedAt: user.vipStartedAt ? user.vipStartedAt.toISOString() : null,
          vipExpiresAt: user.vipExpiresAt ? user.vipExpiresAt.toISOString() : null,
        }}
      />

      <SiteFooter />
    </main>
  );
}
