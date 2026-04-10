

import { HomeCatalogPanel } from "@/components/home-catalog-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

 
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="home" />



      <HomeCatalogPanel />

      <SiteFooter />
    </main>
  );
}
