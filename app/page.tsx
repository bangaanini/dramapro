import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";

import { HomeCatalogPanel } from "@/components/home-catalog-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
 
export default function HomePage() {

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="home" />

      <section className="soft-panel relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,122,69,0.18),transparent_28%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <Badge className="border-accent/40 bg-accent-soft text-accent">
              <Sparkles className="mr-2 size-3.5" />
              Metadata-first streaming gateway
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Short dramas, synced locally, streamed fresh on demand.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                DramaPro keeps provider metadata in Postgres and fetches signed
                playback URLs just in time, so the catalog stays fast without
                shipping stale streams.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/profile"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Buka profil
              </Link>
              <Link
                href="/search"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Buka pencarian
              </Link>
            </div>
          </div>
          <div className="grid gap-3 rounded-3xl border border-white/8 bg-black/20 p-4 text-sm text-[var(--muted)] shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 text-white">
              <Flame className="size-4 text-accent" />
              <span className="font-medium">Catalog sync-ready</span>
            </div>
            <p>8 providers normalized behind one adapter.</p>
            <p>Playback URLs are never persisted.</p>
          </div>
        </div>
      </section>

      <HomeCatalogPanel />

      <SiteFooter />
    </main>
  );
}
