import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Script from "next/script";
import "./globals.css";
import "video.js/dist/video-js.css";

import { TelegramMiniAppBridge } from "@/components/telegram-mini-app-bridge";
import {
  getAppSettings,
  DEFAULT_OG_IMAGE,
} from "@/lib/app-settings";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120c0b",
  colorScheme: "dark",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  const site = settings.site;
  const ogImage = site.ogImageUrl || DEFAULT_OG_IMAGE;

  return {
    metadataBase: new URL(site.url),
    applicationName: site.name,
    title: {
      default: site.title,
      template: `%s | ${site.name}`,
    },
    description: site.description,
    manifest: "/manifest.webmanifest",
    alternates: {
      canonical: "/",
    },
    keywords: [
      "short drama",
      "drama china",
      "drama sub indo",
      "short drama indonesia",
      "streaming drama",
      "reelshort",
      "melolo",
      "dramabox",
    ],
    authors: [{ name: site.name }],
    creator: site.name,
    publisher: site.name,
    category: "entertainment",
    icons: {
      icon: [
        { url: "/favicon_io/favicon.ico" },
        { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [{ url: "/favicon_io/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: ["/favicon_io/favicon.ico"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: "/",
      siteName: site.name,
      title: site.title,
      description: site.description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${site.name} Open Graph preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: site.title,
      description: site.description,
      images: [ogImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <Script
          src="https://telegram.org/js/telegram-web-app.js?62"
          strategy="beforeInteractive"
        />
        <Suspense fallback={null}>
          <TelegramMiniAppBridge />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
