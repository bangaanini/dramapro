import { SearchPanelContainer } from "@/components/search-panel-container";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <main className="route-transition-shell min-h-screen w-full bg-[#030613] text-white">
      <SiteHeader current="account" />

      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_50%_0%,rgba(255,58,58,0.12),transparent_32%),radial-gradient(circle_at_25%_18%,rgba(78,123,255,0.1),transparent_28%)]" />
        <SearchPanelContainer />
      </div>

      <SiteFooter />
    </main>
  );
}
