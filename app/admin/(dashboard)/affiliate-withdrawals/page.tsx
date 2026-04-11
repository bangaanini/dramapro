import { CheckCircle2, Wallet } from "lucide-react";

import { updateAffiliateWithdrawalStatusAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatIdr } from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminAffiliateWithdrawalsPage(
  props: PageProps<"/admin/affiliate-withdrawals">,
) {
  const searchParams = await props.searchParams;
  const saved = searchParams.saved === "1";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;

  const [pendingWithdrawals, recentReviewed] = await Promise.all([
    prisma.affiliateWithdrawal.findMany({
      where: {
        status: "pending",
      },
      include: {
        affiliateUser: {
          select: {
            name: true,
            email: true,
            affiliateCode: true,
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
      take: 30,
    }),
    prisma.affiliateWithdrawal.findMany({
      where: {
        status: {
          in: ["approved", "paid", "rejected"],
        },
      },
      include: {
        affiliateUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        reviewedAt: "desc",
      },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <Wallet className="mr-2 size-3.5" />
          Withdraw affiliate
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Request Withdraw Affiliate
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Review semua permintaan withdraw affiliate.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Pending" value={String(pendingWithdrawals.length)} />
          <StatCard label="Recent reviewed" value={String(recentReviewed.length)} />
          <StatCard
            label="Mode review"
            value={pendingWithdrawals.length > 0 ? "Aktif" : "Santai"}
          />
        </div>
      </div>

      {saved ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Status request withdraw berhasil diperbarui.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
                <Wallet className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Withdrawal pending
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Permintaan terbaru yang menunggu tindakan admin.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {pendingWithdrawals.length > 0 ? (
                pendingWithdrawals.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{item.affiliateUser.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {item.affiliateUser.email}
                          {item.affiliateUser.affiliateCode
                            ? ` • ${item.affiliateUser.affiliateCode}`
                            : ""}
                        </p>
                      </div>
                      <Badge className="border-amber-400/20 bg-amber-500/10 text-amber-100">
                        Pending
                      </Badge>
                    </div>

                    <p className="mt-3 text-lg font-semibold text-white">
                      {formatIdr(item.amount)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Diajukan {formatDate(item.requestedAt)}
                    </p>

                    <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/5 p-3 text-sm">
                      <p className="font-medium text-white">Detail transfer</p>
                      <p className="mt-2 text-[var(--muted)]">
                        {item.payoutAccountHolderName || "-"}
                      </p>
                      <p className="mt-1 text-[var(--muted)]">
                        {item.payoutBankName || "-"} • {item.payoutAccountNumber || "-"}
                      </p>
                      <p className="mt-1 text-[var(--muted)]">
                        WhatsApp {item.payoutWhatsappNumber || "-"}
                      </p>
                      <p className="mt-1 text-[var(--muted)]">
                        {item.payoutEmail || "-"}
                      </p>
                      {item.notes ? (
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                          Catatan: {item.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={updateAffiliateWithdrawalStatusAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="nextStatus" value="approved" />
                        <Button type="submit" size="sm">
                          Approve
                        </Button>
                      </form>
                      <form action={updateAffiliateWithdrawalStatusAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="nextStatus" value="paid" />
                        <Button type="submit" size="sm" variant="secondary">
                          Mark paid
                        </Button>
                      </form>
                      <form action={updateAffiliateWithdrawalStatusAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="nextStatus" value="rejected" />
                        <Button type="submit" size="sm" variant="ghost">
                          Reject
                        </Button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Belum ada withdrawal affiliate yang menunggu review.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Riwayat review</h2>
                <p className="text-sm text-[var(--muted)]">
                  Status terbaru yang sudah ditindak admin.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {recentReviewed.length > 0 ? (
                recentReviewed.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{item.affiliateUser.name}</p>
                        <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                          {item.affiliateUser.email}
                        </p>
                      </div>
                      <Badge
                        className={
                          item.status === "paid"
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                            : item.status === "approved"
                              ? "border-sky-400/20 bg-sky-500/10 text-sky-100"
                              : "border-red-400/20 bg-red-500/10 text-red-100"
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-base font-semibold text-white">
                      {formatIdr(item.amount)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {item.reviewedAt ? formatDate(item.reviewedAt) : formatDate(item.requestedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Belum ada riwayat review withdrawal.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
