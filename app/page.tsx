import type { Metadata } from "next";

import { AffiliateCaptureEffect } from "@/components/affiliate-capture-effect";
import { HomeCatalogPanel } from "@/components/home-catalog-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getHomepageCatalogData } from "@/lib/catalog-data";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  toSeoDescription,
} from "@/lib/site";

const HOME_DESCRIPTION = toSeoDescription(
  "Jelajahi ribuan short drama sub Indo dari banyak provider dalam satu platform cepat. DramaPro menyediakan ribuan short drama terbaru dari berbagai sumber update setiap hari.",
  SITE_DESCRIPTION,
);

export const metadata: Metadata = {
  title: "Nonton short drama sub Indo fresh setiap hari",
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  keywords: [
    "nonton short drama sub indo",
    "short drama terbaru",
    "drama vertikal",
    "streaming drama china",
    "drama pendek",
  ],
  openGraph: {
    title: "DramaPro - Platform short drama sub Indo",
    description: HOME_DESCRIPTION,
    url: "/",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        alt: "DramaPro homepage preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DramaPro -  Platform short drama sub Indo",
    description: HOME_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function HomePage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const referralCode =
    typeof searchParams.ref === "string" ? searchParams.ref.trim().toUpperCase() : "";

  const catalogData = await getHomepageCatalogData();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: absoluteUrl("/"),
        description: HOME_DESCRIPTION,
        inLanguage: "id-ID",
      },
      {
        "@type": "CollectionPage",
        name: "Platform short drama DramaPro",
        url: absoluteUrl("/"),
        description: HOME_DESCRIPTION,
        isPartOf: {
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl("/"),
        },
      },
    ],
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {referralCode ? <AffiliateCaptureEffect referralCode={referralCode} /> : null}
      <SiteHeader current="home" />

      <HomeCatalogPanel data={catalogData} />

      <SiteFooter />
    </main>
  );
}
