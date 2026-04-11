import { AffiliateCaptureEffect } from "@/components/affiliate-capture-effect";
import { HomeCatalogPanel } from "@/components/home-catalog-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getHomepageCatalogData } from "@/lib/catalog-data";

export default async function HomePage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const referralCode =
    typeof searchParams.ref === "string" ? searchParams.ref.trim().toUpperCase() : "";

  const catalogData = await getHomepageCatalogData();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      {referralCode ? <AffiliateCaptureEffect referralCode={referralCode} /> : null}
      <SiteHeader current="home" />

      <HomeCatalogPanel data={catalogData} />

      <SiteFooter />
    </main>
  );
}
