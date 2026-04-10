"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crown,
  LayoutGrid,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const adminNavItems = [
  {
    href: "/admin/users",
    label: "User",
    description: "Kelola akun penonton",
    icon: Users,
  },
  {
    href: "/admin/vip-settings",
    label: "Pengaturan VIP",
    description: "Atur episode terkunci",
    icon: Settings2,
  },
  {
    href: "/admin/vip-pricing",
    label: "Harga VIP",
    description: "Siapkan paket pembayaran",
    icon: Crown,
  },
  {
    href: "/admin/sync",
    label: "Sync",
    description: "Jalankan sinkronisasi metadata",
    icon: LayoutGrid,
  },
] as const;

type AdminSidebarProps = {
  adminName: string;
  adminEmail: string;
};

export function AdminSidebar({
  adminName,
  adminEmail,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="space-y-4">
      <div className="glass-panel rounded-[2rem] border border-white/10 p-5">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <ShieldCheck className="mr-2 size-3.5" />
          Admin dashboard
        </Badge>

        <div className="mt-4 space-y-1">
          <h2 className="text-lg font-semibold text-white">{adminName}</h2>
          <p className="text-sm text-[var(--muted)]">{adminEmail}</p>
        </div>
      </div>

      <nav className="glass-panel rounded-[2rem] border border-white/10 p-3">
        <div className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group min-w-[180px] rounded-[1.4rem] border px-4 py-3 transition md:block md:min-w-0",
                  isActive
                    ? "border-accent/35 bg-accent-soft text-white shadow-[0_18px_40px_rgba(255,122,69,0.12)]"
                    : "border-transparent bg-white/4 text-[var(--muted)] hover:border-white/10 hover:bg-white/7 hover:text-white",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "rounded-2xl border p-2.5 transition",
                      isActive
                        ? "border-accent/35 bg-accent text-white"
                        : "border-white/10 bg-black/25 text-[var(--muted)] group-hover:text-white",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
