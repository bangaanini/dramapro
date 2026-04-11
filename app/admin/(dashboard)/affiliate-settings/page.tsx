import { BadgePercent, CheckCircle2, Wallet } from "lucide-react";

import {
  saveAffiliateSettingsAction,
  updateAffiliateWithdrawalStatusAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_AFFILIATE_SETTINGS, formatIdr } from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAffiliateSettingsPage(
  props: PageProps<"/admin/affiliate-settings">,
) {
  const searchParams = await props.searchParams;
  const saved = searchParams.saved === "1";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;

  const [settings, pendingWithdrawals, commissionTotals] = await Promise.all([
    prisma.affiliateSettings.findUnique({
      where: { id: "global" },
    }),
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
      take: 20,
    }),
    prisma.affiliateCommission.aggregate({
      _sum: {
        amount: true,
      },
    }),
  ]);

  const current = settings ?? DEFAULT_AFFILIATE_SETTINGS;

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <BadgePercent className="mr-2 size-3.5" />
          Tabel affiliate
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Pengaturan Komisi Affiliate
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Atur tingkatan referral, persentase komisi, masa simpan cookie referral,
          minimum penarikan, dan review permintaan withdrawal user.
        </p>

        {pendingWithdrawals.length > 0 ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
            <span className="inline-flex size-2 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.85)]" />
            Ada {pendingWithdrawals.length} request withdrawal baru menunggu review
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Status program"
            value={current.isEnabled ? "Aktif" : "Nonaktif"}
          />
          <StatCard
            label="Minimum withdrawal"
            value={formatIdr(current.minimumWithdrawalAmount)}
          />
          <StatCard
            label="Akumulasi komisi"
            value={formatIdr(commissionTotals._sum.amount ?? 0)}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            {saved ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                Pengaturan affiliate berhasil diperbarui.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <form action={saveAffiliateSettingsAction} className="space-y-5">
              <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
                <input
                  name="isEnabled"
                  type="checkbox"
                  defaultChecked={current.isEnabled}
                  className="size-4 accent-[var(--accent)]"
                />
                <div>
                  <p className="font-medium text-white">Aktifkan program affiliate</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Jika nonaktif, link referral tetap tersimpan tapi komisi baru tidak dibuat.
                  </p>
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Cookie referral (hari)"
                  name="cookieTtlDays"
                  type="number"
                  defaultValue={current.cookieTtlDays}
                  min={1}
                />
                <Field
                  label="Minimum withdrawal"
                  name="minimumWithdrawalAmount"
                  type="number"
                  defaultValue={current.minimumWithdrawalAmount}
                  min={1000}
                />
              </div>

              <TierSection
                title="Bronze"
                minName="bronzeMinActiveReferrals"
                rateName="bronzeCommissionRate"
                minValue={current.bronzeMinActiveReferrals}
                rateValue={current.bronzeCommissionRate}
              />
              <TierSection
                title="Silver"
                minName="silverMinActiveReferrals"
                rateName="silverCommissionRate"
                minValue={current.silverMinActiveReferrals}
                rateValue={current.silverCommissionRate}
              />
              <TierSection
                title="Gold"
                minName="goldMinActiveReferrals"
                rateName="goldCommissionRate"
                minValue={current.goldMinActiveReferrals}
                rateValue={current.goldCommissionRate}
              />
              <TierSection
                title="Platinum"
                minName="platinumMinActiveReferrals"
                rateName="platinumCommissionRate"
                minValue={current.platinumMinActiveReferrals}
                rateValue={current.platinumCommissionRate}
              />

              <TextAreaField
                label="Catatan komisi"
                name="commissionNotes"
                defaultValue={current.commissionNotes}
              />
              <TextAreaField
                label="Catatan withdrawal"
                name="withdrawalNotes"
                defaultValue={current.withdrawalNotes}
              />
              <TextAreaField
                label="Ketentuan lain"
                name="otherTerms"
                defaultValue={current.otherTerms}
              />

              <Button type="submit" className="w-full">
                Simpan pengaturan affiliate
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
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
                    Review permintaan penarikan affiliate terbaru.
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
                      <p className="font-medium text-white">{item.affiliateUser.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {item.affiliateUser.email}
                        {item.affiliateUser.affiliateCode
                          ? ` • ${item.affiliateUser.affiliateCode}`
                          : ""}
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {formatIdr(item.amount)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Diajukan{" "}
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(item.requestedAt)}
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

                      <div className="mt-4 flex gap-2">
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
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Ringkasan level</h2>
                  <p className="text-sm text-[var(--muted)]">
                    Komisi aktif yang berlaku di aplikasi.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <TierSummary
                  label="Bronze"
                  referrals={current.bronzeMinActiveReferrals}
                  rate={current.bronzeCommissionRate}
                />
                <TierSummary
                  label="Silver"
                  referrals={current.silverMinActiveReferrals}
                  rate={current.silverCommissionRate}
                />
                <TierSummary
                  label="Gold"
                  referrals={current.goldMinActiveReferrals}
                  rate={current.goldCommissionRate}
                />
                <TierSummary
                  label="Platinum"
                  referrals={current.platinumMinActiveReferrals}
                  rate={current.platinumCommissionRate}
                />
              </div>
            </CardContent>
          </Card>
        </div>
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

function Field(props: {
  label: string;
  name: string;
  type: string;
  defaultValue: number;
  min?: number;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{props.label}</span>
      <input
        name={props.name}
        type={props.type}
        min={props.min}
        defaultValue={props.defaultValue}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
      />
    </label>
  );
}

function TierSection({
  title,
  minName,
  rateName,
  minValue,
  rateValue,
}: {
  title: string;
  minName: string;
  rateName: string;
  minValue: number;
  rateValue: number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
      <p className="font-medium text-white">{title}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Minimal referral aktif"
          name={minName}
          type="number"
          defaultValue={minValue}
          min={0}
        />
        <Field
          label="Komisi (%)"
          name={rateName}
          type="number"
          defaultValue={rateValue}
          min={0}
        />
      </div>
    </div>
  );
}

function TierSummary({
  label,
  referrals,
  rate,
}: {
  label: string;
  referrals: number;
  rate: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-3">
      <span className="font-medium text-white">{label}</span>
      <span className="text-[var(--muted)]">
        {referrals}+ referral aktif • {rate}%
      </span>
    </div>
  );
}
