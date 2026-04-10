

import { SearchPanel } from "@/components/search-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSearchShortcuts } from "@/lib/search-shortcuts";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const shortcuts = await getSearchShortcuts();

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <SearchPanel providers={shortcuts.providers} tags={shortcuts.tags} />
      <SiteFooter />
    </main>
  );
}
