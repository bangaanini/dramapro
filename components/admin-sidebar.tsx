"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BadgePercent,
  Crown,
  CreditCard,
  KeyRound,
  LayoutGrid,
  Menu,
  SlidersHorizontal,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  X,
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
    href: "/admin/affiliate-settings",
    label: "Affiliate",
    description: "Atur komisi dan level referral",
    icon: BadgePercent,
  },
  {
    href: "/admin/affiliate-withdrawals",
    label: "Withdraw Affiliate",
    description: "Review permintaan withdraw",
    icon: Wallet,
  },
  {
    href: "/admin/payment-gateways",
    label: "Payment Gateway",
    description: "Atur checkout dan credential",
    icon: CreditCard,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    description: "Atur Telegram dan SEO web",
    icon: SlidersHorizontal,
  },
  {
    href: "/admin/password",
    label: "Password Admin",
    description: "Ubah password dashboard",
    icon: KeyRound,
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
  pendingAffiliateWithdrawals: number;
};

export function AdminSidebar({
  adminName,
  adminEmail,
  pendingAffiliateWithdrawals,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <aside className="space-y-4">
      <div className="sticky top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 md:hidden">
        <div className="glass-panel rounded-[1.8rem] border border-white/10 bg-[rgba(24,16,15,0.9)] p-4 shadow-[0_20px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                <ShieldCheck className="mr-2 size-3.5" />
                Admin dashboard
              </Badge>
              <p className="mt-3 truncate text-sm font-semibold text-white">
                {adminName}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">{adminEmail}</p>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              aria-label="Buka navigasi admin"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden space-y-4 md:block">
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
          <div className="space-y-2">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  description={item.description}
                  isActive={isActive}
                  icon={Icon}
                  pendingAffiliateWithdrawals={pendingAffiliateWithdrawals}
                  onNavigate={() => setIsDrawerOpen(false)}
                />
              );
            })}
          </div>
        </nav>
      </div>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Tutup navigasi admin"
          />

          <div className="absolute inset-y-0 left-0 flex w-[min(88vw,22rem)] flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(31,21,20,0.98),rgba(17,12,11,0.98))] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge className="border-accent/30 bg-accent-soft text-accent">
                    <ShieldCheck className="mr-2 size-3.5" />
                    Control room
                  </Badge>
                  <p className="mt-3 truncate text-base font-semibold text-white">
                    {adminName}
                  </p>
                  <p className="truncate text-sm text-[var(--muted)]">
                    {adminEmail}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
                  aria-label="Tutup menu admin"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <nav className="mt-4 flex-1 space-y-2 overflow-y-auto">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  description={item.description}
                  isActive={isActive}
                  icon={Icon}
                  pendingAffiliateWithdrawals={pendingAffiliateWithdrawals}
                  onNavigate={() => setIsDrawerOpen(false)}
                />
              );
            })}
          </nav>
        </div>
        </div>
      ) : null}
    </aside>
  );
}

function NavItem({
  href,
  label,
  description,
  isActive,
  icon: Icon,
  pendingAffiliateWithdrawals,
  onNavigate,
}: {
  href: string;
  label: string;
  description: string;
  isActive: boolean;
  icon: typeof Users;
  pendingAffiliateWithdrawals: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group block rounded-[1.4rem] border px-4 py-3 transition",
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold leading-5">{label}</p>
            {href === "/admin/affiliate-withdrawals" &&
            pendingAffiliateWithdrawals > 0 ? (
              <>
                <span className="inline-flex size-2 rounded-full bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.8)]" />
                <Badge className="border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100">
                  {pendingAffiliateWithdrawals} baru
                </Badge>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
