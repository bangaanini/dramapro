import { Search } from "lucide-react";

import { SearchPanel } from "@/components/search-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { getSearchShortcuts } from "@/lib/search-shortcuts";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const shortcuts = await getSearchShortcuts();

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <section className="soft-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <div className="space-y-3">
          <Badge className="border-accent/30 bg-accent-soft text-accent">
            <Search className="mr-2 size-3.5" />
            Search hub
          </Badge>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Cari drama favoritmu
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Gunakan keyword, provider, dan tag untuk menemukan judul dengan cepat
              dari seluruh katalog lokal DramaPro.
            </p>
          </div>
        </div>
      </section>

      <SearchPanel providers={shortcuts.providers} tags={shortcuts.tags} />
      <SiteFooter />
    </main>
  );
}
