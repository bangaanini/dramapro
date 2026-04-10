"use client";

import Link from "next/link";
import { Heart, History, Home, Search, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/search", label: "Cari", icon: Search, key: "search", prominent: false },
  { href: "/favorites", label: "Favorit", icon: Heart, key: "favorites", prominent: false },
  { href: "/", label: "HOME", icon: Home, key: "home", prominent: true },
  { href: "/history", label: "Riwayat", icon: History, key: "history", prominent: false },
  { href: "/profile", label: "Profil", icon: UserRound, key: "profile", prominent: false },
] as const;

function resolveCurrentKey(pathname: string) {
  if (pathname === "/") {
    return "home";
  }

  if (pathname.startsWith("/search")) {
    return "search";
  }

  if (pathname.startsWith("/favorites")) {
    return "favorites";
  }

  if (pathname.startsWith("/history")) {
    return "history";
  }

  if (pathname.startsWith("/profile") || pathname.startsWith("/library")) {
    return "profile";
  }

  return null;
}

export function SiteFooter() {
  const pathname = usePathname();
  const currentKey = resolveCurrentKey(pathname);

  return (
    <>
      <div className="h-30 sm:h-32" />

      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
        <nav className="floating-nav-shell mx-auto flex w-full max-w-2xl items-end justify-between rounded-[2rem] px-3 py-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentKey === item.key;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-2 text-center transition",
                  item.prominent ? "pb-0" : "pt-1",
                )}
              >
                <span
                  className={cn(
                    "relative inline-flex items-center justify-center rounded-full border transition",
                    item.prominent
                      ? cn(
                          "size-16 -translate-y-7 shadow-[0_0_26px_rgba(168,85,247,0.38)] before:absolute before:inset-0 before:rounded-full before:bg-[radial-gradient(circle,rgba(199,132,255,0.22),transparent_66%)]",
                          isActive
                            ? "border-fuchsia-300/40 bg-[linear-gradient(180deg,#b55cff,#8b3dff)] text-white"
                            : "border-white/12 bg-black text-white/85",
                        )
                      : cn(
                          "size-11 border-transparent",
                          isActive
                            ? "bg-white/12 text-white shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
                            : "bg-transparent text-white/60",
                        ),
                  )}
                >
                  <Icon className={item.prominent ? "size-7" : "size-6"} />
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium tracking-tight",
                    isActive ? "text-white" : "text-white/58",
                    item.prominent && "mt-[-0.8rem] font-semibold",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
