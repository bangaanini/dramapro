import Link from "next/link";
import { Clapperboard, Compass, Home, LibraryBig } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { UserSessionNav } from "@/components/user-session-nav";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  current?: "home" | "library" | "account" | "watch";
};

const navItems = [
  { href: "/", label: "Home", key: "home", icon: Home },
  { href: "/library", label: "Library", key: "library", icon: LibraryBig },
];

export async function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 pb-4 pt-3 sm:pt-4">
      <div className="glass-panel rounded-[1.8rem] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="group flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent-soft text-accent shadow-[0_14px_30px_rgba(255,122,69,0.18)] transition group-hover:scale-[1.03]">
                <Clapperboard className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold tracking-tight text-white">
                    DramaPro
                  </p>
                  <Badge className="border-white/10 bg-black/30 text-white/80">
                    Mobile-first
                  </Badge>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Short drama catalog, favorites, and fresh playback
                </p>
              </div>
            </Link>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = current === item.key;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "border-accent/30 bg-accent-soft text-white shadow-[0_12px_26px_rgba(255,122,69,0.18)]"
                        : "border-white/10 bg-white/5 text-[var(--muted)] hover:border-white/20 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}

              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                  current === "watch"
                    ? "border-accent/24 bg-black/25 text-white"
                    : "border-white/8 bg-black/15 text-[var(--muted-foreground)]",
                )}
              >
                <Compass className="size-4" />
                Watch
              </div>
            </nav>

            <UserSessionNav />
          </div>
        </div>
      </div>
    </header>
  );
}
