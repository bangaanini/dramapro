import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowUpRight,
  BadgeDollarSign,
  CircleDollarSign,
  Crown,
  Gem,
  Gift,
  Landmark,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";

import { requestAffiliateWithdrawalAction } from "@/app/affiliate/actions";
import { AffiliateLinkCard } from "@/components/affiliate-link-card";
import { FormSubmitButton } from "@/components/form-submit-button";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildAffiliateLink,
  buildTelegramAffiliateLink,
  calculateAffiliateAvailableBalance,
  ensureUserAffiliateCode,
  formatIdr,
  getAffiliateSettings,
  getAffiliateTier,
} from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import { getUserSecondaryLabel } from "@/lib/user-identity";
import { getCurrentUser } from "@/lib/user-auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AffiliatePage(props: PageProps<"/affiliate">) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/affiliate");
  }

  const searchParams = await props.searchParams;
  const success = searchParams.success === "1";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const payoutSuccess =
    typeof searchParams.payoutSuccess === "string"
      ? searchParams.payoutSuccess
      : null;

  const [headerStore, settings, affiliateCode, payoutProfile, totalReferrals, activeReferrals, commissionTotals, withdrawalTotals, recentWithdrawals, recentCommissions] =
    await Promise.all([
      headers(),
      getAffiliateSettings(),
      ensureUserAffiliateCode(user.id, user.name),
      prisma.affiliatePayoutProfile.findUnique({
        where: {
          userId: user.id,
        },
      }),
      prisma.user.count({
        where: {
          referredById: user.id,
        },
      }),
      prisma.user.count({
        where: {
          referredById: user.id,
          vipPayments: {
            some: {
              status: "paid",
            },
          },
        },
      }),
      prisma.affiliateCommission.groupBy({
        by: ["status"],
        where: {
          affiliateUserId: user.id,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.affiliateWithdrawal.groupBy({
        by: ["status"],
        where: {
          affiliateUserId: user.id,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.affiliateWithdrawal.findMany({
        where: {
          affiliateUserId: user.id,
        },
        orderBy: {
          requestedAt: "desc",
        },
        take: 5,
      }),
      prisma.affiliateCommission.findMany({
        where: {
          affiliateUserId: user.id,
        },
        include: {
          referredUser: {
            select: {
              name: true,
              email: true,
              authProvider: true,
              telegramUsername: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      }),
    ]);

  if (!affiliateCode) {
    throw new Error("Kode affiliate user tidak tersedia.");
  }

  const totalCommission = commissionTotals.reduce((sum, item) => {
    if (item.status === "cancelled") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);

  const totalWithdrawn = withdrawalTotals.reduce((sum, item) => {
    if (item.status !== "approved" && item.status !== "paid") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);

  const totalReserved = withdrawalTotals.reduce((sum, item) => {
    if (item.status !== "pending") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);

  const availableBalance = calculateAffiliateAvailableBalance({
    totalCommission,
    totalWithdrawn,
    totalReserved,
  });
  const tier = getAffiliateTier(activeReferrals, settings);
  const nextTier = getNextAffiliateTier(activeReferrals, settings);

  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";
  const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();
  const referralLink =
    user.authProvider === "telegram" && telegramBotUsername
      ? buildTelegramAffiliateLink(telegramBotUsername, affiliateCode)
      : buildAffiliateLink(`${proto}://${host}`, affiliateCode);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 pb-28 pt-4 sm:px-5 sm:pt-6">
      <section className="space-y-4">
        <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(119,89,255,0.32),transparent_42%),linear-gradient(180deg,rgba(58,34,74,0.98),rgba(24,17,26,0.98))] p-4 shadow-[0_32px_80px_rgba(0,0,0,0.34)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge className="border-white/10 bg-white/8 text-white">
                Program Afiliasi
              </Badge>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Referral DramaPro
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/70">
                Bagikan link affiliate kamu, pantau referral aktif, lalu tarik komisi
                langsung ke rekening payout default.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                Level aktif
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{tier.level}</p>
            </div>
          </div>

          {!settings.isEnabled ? (
            <InlineNotice
              tone="warning"
              className="mt-4"
              message="Program affiliate sedang dinonaktifkan admin. Data referral dan komisi lama tetap aman."
            />
          ) : null}

          {success ? (
            <InlineNotice
              tone="success"
              className="mt-4"
              message="Permintaan penarikan komisi berhasil diajukan ke admin."
            />
          ) : null}

          {payoutSuccess ? (
            <InlineNotice
              tone="success"
              className="mt-4"
              message={payoutSuccess}
            />
          ) : null}

          {error ? (
            <InlineNotice tone="danger" className="mt-4" message={error} />
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-[1.45fr_0.95fr]">
            <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(84,102,255,0.95),rgba(102,68,255,0.88))] p-4 text-white shadow-[0_24px_60px_rgba(72,76,255,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5">
                  <BadgeDollarSign className="size-5" />
                </div>
                <Badge className="border-white/15 bg-white/10 text-white">
                  Siap ditarik
                </Badge>
              </div>
              <p className="mt-5 text-xs uppercase tracking-[0.26em] text-white/60">
                Saldo komisi
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                {formatIdr(availableBalance)}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <MiniStat label="Pending" value={formatIdr(totalReserved)} />
                <MiniStat label="Withdraw" value={formatIdr(totalWithdrawn)} />
                <MiniStat label="Referral aktif" value={String(activeReferrals)} />
              </div>
            </div>

            <div className="space-y-3">
              <CompactInfoCard
                icon={Users}
                label="Referral"
                value={String(totalReferrals)}
                subtext={`${activeReferrals} referral aktif`}
              />
              <CompactInfoCard
                icon={CircleDollarSign}
                label="Total komisi"
                value={formatIdr(totalCommission)}
                subtext={`Minimum withdraw ${formatIdr(settings.minimumWithdrawalAmount)}`}
              />
            </div>
          </div>

          <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-black/18 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Progress level
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-amber-400/20 bg-amber-500/12 text-amber-100">
                    <Crown className="mr-1.5 size-3.5" />
                    {tier.level}
                  </Badge>
                  <span className="text-sm text-white/72">
                    Komisi {tier.rate}% per transaksi VIP berhasil
                  </span>
                </div>
              </div>

              {nextTier ? (
                <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-right">
                  <p className="text-xs text-white/48">Menuju {nextTier.level}</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {Math.max(0, nextTier.minReferrals - activeReferrals)} referral lagi
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100">
                  Level tertinggi aktif
                </div>
              )}
            </div>
          </div>
        </div>

        <AffiliateLinkCard link={referralLink} />

        <Card className="soft-panel rounded-[1.8rem] border-white/10">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">Aktivitas terbaru</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Referral baru, komisi masuk, dan update withdraw terakhir.
                </p>
              </div>
              <Badge className="border-white/10 bg-white/6 text-white">
                {recentCommissions.length + recentWithdrawals.length} item
              </Badge>
            </div>

            <div className="space-y-3">
              {recentCommissions.length === 0 && recentWithdrawals.length === 0 ? (
                <EmptyAffiliateState
                  icon={Sparkles}
                  title="Belum ada aktivitas"
                  description="Bagikan link affiliate kamu dulu. Aktivitas referral dan komisi akan muncul di sini."
                />
              ) : (
                <>
                  {recentCommissions.map((item) => (
                    <ActivityRow
                      key={item.id}
                      icon={Gift}
                      title={`Komisi dari ${item.referredUser.name}`}
                      description={getUserSecondaryLabel(item.referredUser)}
                      meta={`${item.commissionRate}% • ${formatDate(item.createdAt)}`}
                      value={formatIdr(item.amount)}
                      tone={item.status === "paid" ? "success" : "default"}
                    />
                  ))}

                  {recentWithdrawals.map((item) => (
                    <ActivityRow
                      key={item.id}
                      icon={WalletCards}
                      title={`Withdraw ${item.status}`}
                      description={`${item.payoutBankName} • ${maskAccountNumber(item.payoutAccountNumber)}`}
                      meta={formatDate(item.requestedAt)}
                      value={formatIdr(item.amount)}
                      tone={item.status === "rejected" ? "danger" : "default"}
                    />
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="soft-panel rounded-[1.8rem] border-white/10">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">Tarik saldo</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Penarikan memakai payout default agar proses admin lebih cepat.
                </p>
              </div>
              <Badge className="border-amber-400/20 bg-amber-500/12 text-amber-100">
                Tersedia {formatIdr(availableBalance)}
              </Badge>
            </div>

            {payoutProfile ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-black/18 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
                    <Landmark className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white">{payoutProfile.accountHolderName}</p>
                    <p className="mt-1 text-sm text-white/68">
                      {payoutProfile.bankName} • {maskAccountNumber(payoutProfile.accountNumber)}
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      {payoutProfile.whatsappNumber} • {payoutProfile.payoutEmail}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <InlineNotice
                tone="warning"
                message="Kamu belum menyimpan payout default. Lengkapi dulu agar withdraw bisa diajukan tanpa isi form berulang."
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Minimum withdraw
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatIdr(settings.minimumWithdrawalAmount)}
                </p>
                <p className="mt-2 text-sm text-white/55">
                  {settings.withdrawalNotes}
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Siap dicairkan
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatIdr(availableBalance)}
                </p>
                <p className="mt-2 text-sm text-white/55">
                  {availableBalance < settings.minimumWithdrawalAmount
                    ? "Saldo belum memenuhi minimum penarikan."
                    : "Saldo sudah bisa diajukan ke admin."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {payoutProfile ? (
                <form action={requestAffiliateWithdrawalAction} className="flex-1">
                  <FormSubmitButton
                    type="submit"
                    className="w-full rounded-2xl"
                    disabled={availableBalance < settings.minimumWithdrawalAmount}
                    idleLabel="Ajukan withdraw"
                    pendingLabel="Mengajukan..."
                  />
                </form>
              ) : (
                <Link
                  href="/profile/payout-settings?next=/affiliate"
                  className={cn(buttonVariants({ size: "default" }), "rounded-2xl")}
                >
                  Isi payout default
                </Link>
              )}

              <Link
                href="/profile/payout-settings?next=/affiliate"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "default" }),
                  "rounded-2xl",
                )}
              >
                {payoutProfile ? "Ubah payout default" : "Atur rekening payout"}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="soft-panel rounded-[1.8rem] border-white/10">
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-lg font-semibold text-white">Cara kerja</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Flow referral dibuat sederhana supaya mudah dibagikan dan dipantau.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Bagikan link",
                  description:
                    "Sebarkan link affiliate kamu ke Telegram, WhatsApp, TikTok bio, atau story.",
                },
                {
                  step: "2",
                  title: "Teman mendaftar",
                  description:
                    "User baru masuk lewat link kamu lalu membuat akun atau membuka Mini App.",
                },
                {
                  step: "3",
                  title: "Teman berlangganan",
                  description:
                    "Ketika referral membeli VIP dan pembayaran sukses, komisi dihitung otomatis.",
                },
                {
                  step: "4",
                  title: "Tarik saldo",
                  description:
                    "Saldo yang sudah memenuhi minimum withdraw bisa langsung diajukan ke admin.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex gap-3 rounded-[1.4rem] border border-white/8 bg-black/16 p-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#8262ff,#5f4bff)] text-sm font-semibold text-white">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/60">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="soft-panel rounded-[1.8rem] border-white/10">
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-lg font-semibold text-white">Keuntungan & aturan</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Ringkasan benefit dan aturan utama program affiliate DramaPro.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <BenefitCard
                icon={Gem}
                title="Komisi bertingkat"
                description={`Bronze ${settings.bronzeCommissionRate}% • Silver ${settings.silverCommissionRate}% • Gold ${settings.goldCommissionRate}% • Platinum ${settings.platinumCommissionRate}%`}
              />
              <BenefitCard
                icon={ShieldCheck}
                title="Tracking aman"
                description={`Cookie referral aktif hingga ${settings.cookieTtlDays} hari, termasuk alur web dan Mini App Telegram.`}
              />
            </div>

            <div className="space-y-3">
              <FaqDisclosure
                title="Kapan referral dihitung aktif?"
                content={settings.otherTerms}
              />
              <FaqDisclosure
                title="Bagaimana komisi dihitung?"
                content={settings.commissionNotes}
              />
              <FaqDisclosure
                title="Kapan saldo bisa ditarik?"
                content={`Saldo bisa diajukan setelah mencapai minimum ${formatIdr(settings.minimumWithdrawalAmount)}. ${settings.withdrawalNotes}`}
              />
              <FaqDisclosure
                title="Kalau butuh strategi promosi, mulai dari mana?"
                content="Mulai dari platform yang sudah kamu kuasai, fokus ke short video, potongan adegan menarik, lalu arahkan audiens ke link affiliate kamu dengan CTA yang konsisten."
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/14 bg-white/10 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/52">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function CompactInfoCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof Gem;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-white/10 bg-black/18 p-4 shadow-[0_16px_34px_rgba(0,0,0,0.18)]">
      <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
        <Icon className="size-4.5" />
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-white/55">{subtext}</p>
    </div>
  );
}

function InlineNotice({
  message,
  tone,
  className,
}: {
  message: string;
  tone: "warning" | "success" | "danger";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.4rem] px-4 py-3 text-sm",
        tone === "warning" && "border border-amber-400/20 bg-amber-500/10 text-amber-100",
        tone === "success" && "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
        tone === "danger" && "border border-red-400/20 bg-red-500/10 text-red-100",
        className,
      )}
    >
      {message}
    </div>
  );
}

function EmptyAffiliateState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-black/12 px-4 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 font-medium text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-white/58">{description}</p>
    </div>
  );
}

function ActivityRow({
  icon: Icon,
  title,
  description,
  meta,
  value,
  tone,
}: {
  icon: typeof Gift;
  title: string;
  description: string;
  meta: string;
  value: string;
  tone: "default" | "success" | "danger";
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[1.4rem] border border-white/8 bg-black/16 p-3.5">
      <div className="flex min-w-0 gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border text-white",
            tone === "success" && "border-emerald-400/20 bg-emerald-500/10",
            tone === "danger" && "border-red-400/20 bg-red-500/10",
            tone === "default" && "border-white/10 bg-white/6",
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{title}</p>
          <p className="mt-1 truncate text-sm text-white/58">{description}</p>
          <p className="mt-1 text-xs text-white/42">{meta}</p>
        </div>
      </div>
      <p className="shrink-0 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Gem;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-black/16 p-4">
      <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
        <Icon className="size-4.5" />
      </div>
      <p className="mt-3 font-medium text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-white/58">{description}</p>
    </div>
  );
}

function FaqDisclosure({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <details className="group rounded-[1.35rem] border border-white/8 bg-black/16 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white">
        <span>{title}</span>
        <ArrowUpRight className="size-4 shrink-0 text-white/45 transition group-open:rotate-45 group-open:text-white" />
      </summary>
      <p className="pt-3 text-sm leading-6 text-white/60">{content}</p>
    </details>
  );
}

function getNextAffiliateTier(
  activeReferrals: number,
  settings: Awaited<ReturnType<typeof getAffiliateSettings>>,
) {
  const orderedTiers = [
    {
      level: "Bronze",
      minReferrals: settings.bronzeMinActiveReferrals,
      rate: settings.bronzeCommissionRate,
    },
    {
      level: "Silver",
      minReferrals: settings.silverMinActiveReferrals,
      rate: settings.silverCommissionRate,
    },
    {
      level: "Gold",
      minReferrals: settings.goldMinActiveReferrals,
      rate: settings.goldCommissionRate,
    },
    {
      level: "Platinum",
      minReferrals: settings.platinumMinActiveReferrals,
      rate: settings.platinumCommissionRate,
    },
  ];

  return orderedTiers.find((tier) => activeReferrals < tier.minReferrals) ?? null;
}

function maskAccountNumber(value: string) {
  if (!value) {
    return "-";
  }

  if (value.length <= 4) {
    return value;
  }

  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
