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
  const telegramTarget =
    typeof searchParams.tg_target === "string" ? searchParams.tg_target.trim() : "";

  if (telegramTarget) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-none flex-col px-0 py-0">
        {referralCode ? <AffiliateCaptureEffect referralCode={referralCode} /> : null}
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="glass-panel w-full max-w-md rounded-[2rem] px-6 py-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-accent/25 bg-accent-soft text-accent shadow-[0_18px_38px_rgba(255,122,69,0.22)]">
              <span className="inline-flex size-3 rounded-full bg-current opacity-90" />
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.24em] text-accent/80">
              Telegram Mini App
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Menyiapkan halaman tujuanmu
            </h1>
            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="size-2 rounded-full bg-accent/90 animate-pulse" />
              <span className="size-2 rounded-full bg-accent/60 animate-pulse [animation-delay:120ms]" />
              <span className="size-2 rounded-full bg-accent/35 animate-pulse [animation-delay:240ms]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

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
    <main className="route-transition-shell mx-auto flex min-h-screen w-full max-w-none flex-col px-0 py-0">
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
