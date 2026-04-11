import { SearchPanelContainer } from "@/components/search-panel-container";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SearchPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-none px-0 py-0">
      <SiteHeader current="account" />

      <div className="mx-auto w-full max-w-7xl px-3 pb-2 sm:px-4 lg:px-6">
        <SearchPanelContainer />
      </div>
      <SiteFooter />
    </main>
  );
}
