"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Search, Trash2 } from "lucide-react";

import {
  deleteUserAction,
  grantUserVipAccessAction,
  updateUserAffiliateCommissionOverrideAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AdminUsersTableData,
  AdminUsersTableRow,
} from "@/lib/admin-users-data";
import { cn } from "@/lib/utils";

type AdminUsersTableProps = {
  initialData: AdminUsersTableData;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildAdminUsersApiUrl(query: string, page: number, pageSize: number) {
  const searchParams = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: String(pageSize),
  });

  return `/api/admin/users?${searchParams.toString()}`;
}

function buildAdminUsersCacheKey(query: string, page: number, pageSize: number) {
  return `${query}:${page}:${pageSize}`;
}

export function AdminUsersTable({ initialData }: AdminUsersTableProps) {
  const [query, setQuery] = useState(initialData.query);
  const deferredQuery = useDeferredValue(query);
  const [page, setPage] = useState(initialData.page);
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(
    new Map<string, AdminUsersTableData>([
      [
        buildAdminUsersCacheKey(
          initialData.query,
          initialData.page,
          initialData.pageSize,
        ),
        initialData,
      ],
    ]),
  );
  const pageSize = initialData.pageSize;

  useEffect(() => {
    cacheRef.current.set(
      buildAdminUsersCacheKey(
        initialData.query,
        initialData.page,
        initialData.pageSize,
      ),
      initialData,
    );
  }, [initialData]);

  useEffect(() => {
    const cacheKey = buildAdminUsersCacheKey(deferredQuery, page, pageSize);
    const cached = cacheRef.current.get(cacheKey);

    if (cached) {
      setData(cached);
      setError(null);
      return;
    }

    const controller = new AbortController();

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildAdminUsersApiUrl(deferredQuery, page, pageSize),
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | AdminUsersTableData
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            payload && "error" in payload && payload.error
              ? payload.error
              : "Gagal memuat user.",
          );
        }

        if (!payload || !("users" in payload)) {
          throw new Error("Payload user tidak valid.");
        }

        cacheRef.current.set(cacheKey, payload);
        setData(payload);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal memuat user.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      controller.abort();
    };
  }, [deferredQuery, page, pageSize]);

  const redirectTo = deferredQuery
    ? `/admin/users?q=${encodeURIComponent(deferredQuery)}`
    : "/admin/users";
  const canGoPrevious = data.page > 1;
  const canGoNext = data.page < data.totalPages;
  const isPreviousDisabled = !canGoPrevious || isLoading;
  const isNextDisabled = !canGoNext || isLoading;
  const paginationLabel = useMemo(
    () => `Halaman ${data.page} dari ${data.totalPages}`,
    [data.page, data.totalPages],
  );

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-[1.7rem] border border-white/10 p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, email, username Telegram, atau kode affiliate..."
            className="h-12 w-full rounded-2xl border border-white/10 bg-black/24 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-accent/45"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <p>
            {isLoading ? "Memuat hasil..." : `Menampilkan ${data.users.length} dari ${data.total} user`}
          </p>
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              className="rounded-full border border-white/10 px-3 py-1.5 text-white/78 transition hover:bg-white/8"
            >
              Reset pencarian
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-[1200px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/4 text-[var(--muted)]">
            <tr>
              <th className="px-5 py-4 font-medium">User</th>
              <th className="px-5 py-4 font-medium">Referred by</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Rate komisi</th>
              <th className="px-5 py-4 font-medium">Saldo komisi</th>
              <th className="px-5 py-4 font-medium">Favorit</th>
              <th className="px-5 py-4 font-medium">Riwayat</th>
              <th className="px-5 py-4 font-medium">Referral aktif</th>
              <th className="px-5 py-4 font-medium">Sesi</th>
              <th className="px-5 py-4 font-medium">Terdaftar</th>
              <th className="px-5 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody
            className={cn(
              "transition-opacity",
              isLoading && "opacity-55",
            )}
          >
            {data.users.length > 0 ? (
              data.users.map((user) => (
                <AdminUserTableRow
                  key={user.id}
                  user={user}
                  redirectTo={redirectTo}
                  vipPlans={data.vipPlans}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={11}
                  className="px-5 py-10 text-center text-[var(--muted)]"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="size-4 animate-spin text-accent" />
                      Memuat user...
                    </span>
                  ) : (
                    "Tidak ada user yang cocok."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">
          {paginationLabel}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPreviousDisabled}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-xl"
          >
            Sebelumnya
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isNextDisabled}
            onClick={() =>
              setPage((current) => Math.min(data.totalPages, current + 1))
            }
            className="rounded-xl"
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminUserTableRow({
  user,
  redirectTo,
  vipPlans,
}: {
  user: AdminUsersTableRow;
  redirectTo: string;
  vipPlans: AdminUsersTableData["vipPlans"];
}) {
  return (
    <tr className="border-b border-white/6 last:border-b-0">
      <td className="px-5 py-4">
        <div>
          <p className="font-semibold text-white">{user.name}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {user.secondaryLabel}
          </p>
        </div>
      </td>
      <td className="px-5 py-4">
        {user.referredBy ? (
          <div>
            <p className="font-medium text-white">{user.referredBy.name}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {user.referredBy.secondaryLabel}
            </p>
          </div>
        ) : (
          <span className="text-[var(--muted-foreground)]">-</span>
        )}
      </td>
      <td className="px-5 py-4">
        <div className="space-y-2">
          <Badge className="border-white/12 bg-black/20 text-white">
            {user.authProvider === "telegram" ? "Telegram" : "Web"}
          </Badge>
          <Badge
            className={
              user.hasActiveVip
                ? "border-amber-400/20 bg-amber-500/12 text-amber-100"
                : "border-white/12 bg-white/6 text-white"
            }
          >
            {user.hasActiveVip ? "Premium" : "Free"}
          </Badge>
          {user.hasActiveVip && user.vipExpiresAt ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Aktif sampai {formatDate(user.vipExpiresAt)}
            </p>
          ) : null}
          <form action={grantUserVipAccessAction} className="space-y-2">
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            {vipPlans.length > 0 ? (
              <select
                name="vipPricePlanId"
                defaultValue=""
                className="h-9 w-full min-w-40 rounded-xl border border-white/10 bg-black/24 px-3 text-xs text-white outline-none transition focus:border-accent/45"
              >
                <option value="" className="bg-slate-950">
                  Pilih durasi VIP
                </option>
                {vipPlans.map((plan) => (
                  <option key={plan.id} value={plan.id} className="bg-slate-950">
                    {plan.name} ({plan.durationDays} hari)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">
                Belum ada paket VIP aktif. Pakai durasi manual.
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                name="vipDurationDays"
                type="number"
                min={1}
                max={3650}
                placeholder="Hari"
                className="h-9 w-20 rounded-xl border border-white/10 bg-black/24 px-3 text-xs text-white outline-none transition placeholder:text-white/35 focus:border-accent/45"
              />
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                className="h-9 rounded-xl px-3 text-xs"
              >
                Beri VIP
              </Button>
            </div>
          </form>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-white">
              {user.effectiveCommissionRate}%
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {user.commissionOverride !== null
                ? "Override admin"
                : `${user.generalTierLevel} umum`}
            </p>
          </div>
          <form
            action={updateUserAffiliateCommissionOverrideAction}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input
              name="affiliateCommissionOverrideRate"
              type="number"
              min={0}
              max={100}
              defaultValue={user.commissionOverride ?? ""}
              placeholder="Umum"
              className="h-9 w-20 rounded-xl border border-white/10 bg-black/24 px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-accent/45"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              className="h-9 rounded-xl px-3"
            >
              Simpan
            </Button>
          </form>
        </div>
      </td>
      <td className="px-5 py-4">
        {user.affiliateCommissionCount > 0 ? (
          <div>
            <p className="font-semibold text-white">
              {formatIdr(user.affiliateCommissionAvailable)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Total {formatIdr(user.affiliateCommissionTotal)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {user.affiliateCommissionCount} transaksi komisi
            </p>
            {user.affiliateCommissionPendingWithdrawal > 0 ? (
              <p className="mt-1 text-xs text-amber-100/80">
                Pending withdraw {formatIdr(user.affiliateCommissionPendingWithdrawal)}
              </p>
            ) : null}
          </div>
        ) : (
          <span className="text-[var(--muted-foreground)]">Belum ada</span>
        )}
      </td>
      <td className="px-5 py-4 text-white">{user.favoritesCount}</td>
      <td className="px-5 py-4 text-white">{user.watchHistoryCount}</td>
      <td className="px-5 py-4">
        <p className="text-white">{user.activeReferralCount}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {user.totalReferralCount} total referral
        </p>
      </td>
      <td className="px-5 py-4 text-white">{user.sessionsCount}</td>
      <td className="px-5 py-4 text-[var(--muted)]">
        {formatDate(user.createdAt)}
      </td>
      <td className="px-5 py-4">
        <form action={deleteUserAction}>
          <input type="hidden" name="userId" value={user.id} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-red-200 hover:bg-red-500/10 hover:text-red-100"
          >
            <Trash2 className="mr-2 size-4" />
            Hapus
          </Button>
        </form>
      </td>
    </tr>
  );
}
