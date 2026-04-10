import Link from "next/link";
import { Heart, LibraryBig, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <div className="glass-panel rounded-[1.9rem] px-5 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end">
          <div className="space-y-4">
            <Badge className="border-accent/30 bg-accent-soft text-accent">
              <Sparkles className="mr-2 size-3.5" />
              Fresh links, local catalog
            </Badge>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Kembali ke home kapan saja, lanjutkan tontonan saat siap.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                DramaPro dirancang mobile-first supaya katalog, player, favorit,
                dan riwayat tetap terasa cepat dipakai dari layar kecil.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Explore
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Home
                </Link>
                <Link
                  href="/library"
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  <LibraryBig className="mr-2 size-4" />
                  Library
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                User
              </p>
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  <Heart className="size-4 text-accent" />
                  Favorit tersimpan di akun
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-accent" />
                  Session aman via cookie server
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                DramaPro
              </p>
              <p>8 provider di-normalisasi ke satu experience.</p>
              <p className="text-[var(--muted-foreground)]">
                Copyright {year} DramaPro
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
