import Link from "next/link";
import { Clapperboard, Flame, Sparkles } from "lucide-react";

import { HomeCatalogPanel } from "@/components/home-catalog-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
 
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="home" />

      <section className="soft-panel relative overflow-hidden rounded-[2rem] px-5 py-5 sm:px-6 sm:py-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,122,69,0.15),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge className="border-accent/40 bg-accent-soft text-accent">
              <Sparkles className="mr-2 size-3.5" />
              Premium short drama catalog
            </Badge>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                Jelajahi short drama premium yang disinkronkan lokal dan siap
                diputar segar kapan saja.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Beranda kini difokuskan untuk discovery: slider hero populer,
                katalog yang lebih rapi, dan navigasi yang lebih cepat untuk
                mobile.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-[1.4rem] border border-white/8 bg-black/18 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 text-white">
                <Flame className="size-4 text-accent" />
                <span className="text-sm font-medium">Popular-first hero</span>
              </div>
              <p className="mt-1 text-xs leading-6 text-white/62">
                Dua drama populer teratas dari tiap provider.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-white/8 bg-black/18 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 text-white">
                <Clapperboard className="size-4 text-accent" />
                <span className="text-sm font-medium">Fresh playback</span>
              </div>
              <p className="mt-1 text-xs leading-6 text-white/62">
                URL stream tetap diambil on-demand, tidak disimpan.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-white/8 bg-black/18 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="size-4 text-accent" />
                <span className="text-sm font-medium">Mobile friendly</span>
              </div>
              <p className="mt-1 text-xs leading-6 text-white/62">
                Discovery dibuat lebih fokus dan nyaman di layar kecil.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/profile"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Buka profil
          </Link>
          <Link
            href="/favorites"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Lihat favorit
          </Link>
        </div>
      </section>

      <HomeCatalogPanel />

      <SiteFooter />
    </main>
  );
}
