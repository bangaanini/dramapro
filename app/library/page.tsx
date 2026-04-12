import { redirect } from "next/navigation";

import { LibraryTabs } from "@/components/library-tabs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function LibraryPage(props: PageProps<"/library">) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/library");
  }

  const searchParams = await props.searchParams;
  const hasExplicitTab =
    typeof searchParams.tab === "string" &&
    (searchParams.tab === "collection" ||
      searchParams.tab === "history" ||
      searchParams.tab === "saved");
  const requestedTab: "collection" | "history" | "saved" =
    hasExplicitTab && searchParams.tab === "history"
      ? "history"
      : hasExplicitTab && searchParams.tab === "saved"
        ? "saved"
        : "collection";

  return (
    <main className="mx-auto min-h-screen w-full max-w-none px-0 py-0">
      <SiteHeader current="account" />
      <LibraryTabs
        key={requestedTab}
        userId={user.id}
        initialTab={requestedTab}
        honorInitialTab={hasExplicitTab}
      />
      <SiteFooter />
    </main>
  );
}
