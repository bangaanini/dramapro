import { SearchPanelContainer } from "@/components/search-panel-container";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SearchPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <SearchPanelContainer />
      <SiteFooter />
    </main>
  );
}
