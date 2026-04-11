import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, Coins, Crown, Gem, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { requestAffiliateWithdrawalAction } from "@/app/affiliate/actions";
import { AffiliateLinkCard } from "@/components/affiliate-link-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildAffiliateLink,
  calculateAffiliateAvailableBalance,
  ensureUserAffiliateCode,
  formatIdr,
  getAffiliateSettings,
  getAffiliateTier,
} from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const affiliateTabs = [
  { key: "dashboard", label: "Dashboard" },
  { key: "history", label: "Riwayat" },
  { key: "tips", label: "Tips" },
  { key: "rules", label: "Aturan" },
] as const;

export default async function AffiliatePage(props: PageProps<"/affiliate">) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/affiliate");
  }

  const searchParams = await props.searchParams;
  const tab =
    typeof searchParams.tab === "string" &&
    affiliateTabs.some((item) => item.key === searchParams.tab)
      ? (searchParams.tab as (typeof affiliateTabs)[number]["key"])
      : "dashboard";
  const success = searchParams.success === "1";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;

  const [affiliateCode, settings, totalReferrals, activeReferrals, commissionTotals, withdrawalTotals, recentWithdrawals, recentCommissions] =
    await Promise.all([
      ensureUserAffiliateCode(user.id, user.name),
      getAffiliateSettings(),
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
        take: 10,
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
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
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

  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const referralLink = buildAffiliateLink(`${proto}://${host}`, affiliateCode);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <div className="mt-6 flex items-center gap-3">
        <Link href="/profile" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="mr-2 size-4" />
          Kembali ke profil
        </Link>
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          Program Affiliate
        </Badge>
      </div>

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(53,37,62,0.92),rgba(36,26,43,0.95))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap gap-2 rounded-[1.4rem] border border-white/8 bg-black/18 p-2">
          {affiliateTabs.map((item) => (
            <Link
              key={item.key}
              href={item.key === "dashboard" ? "/affiliate" : `/affiliate?tab=${item.key}`}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5 text-center text-sm transition",
                tab === item.key
                  ? "bg-white/8 text-white"
                  : "text-[var(--muted-foreground)] hover:bg-white/5 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {!settings.isEnabled ? (
          <div className="mt-5 rounded-[1.4rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Program affiliate saat ini sedang dinonaktifkan admin. Data referral dan komisi lama tetap aman.
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 rounded-[1.4rem] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Permintaan penarikan komisi berhasil diajukan ke admin.
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-[1.4rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          {tab === "dashboard" ? (
            <DashboardTab
              activeReferrals={activeReferrals}
              availableBalance={availableBalance}
              minimumWithdrawalAmount={settings.minimumWithdrawalAmount}
              referralLink={referralLink}
              tier={tier}
              totalReferrals={totalReferrals}
            />
          ) : null}

          {tab === "history" ? (
            <HistoryTab
              totalCommission={totalCommission}
              totalWithdrawn={totalWithdrawn}
              recentWithdrawals={recentWithdrawals}
              recentCommissions={recentCommissions}
            />
          ) : null}

          {tab === "tips" ? <TipsTab /> : null}

          {tab === "rules" ? (
            <RulesTab
              settings={settings}
            />
          ) : null}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function DashboardTab({
  tier,
  activeReferrals,
  totalReferrals,
  availableBalance,
  minimumWithdrawalAmount,
  referralLink,
}: {
  tier: ReturnType<typeof getAffiliateTier>;
  activeReferrals: number;
  totalReferrals: number;
  availableBalance: number;
  minimumWithdrawalAmount: number;
  referralLink: string;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <StatBox
          icon={Gem}
          label="Affiliate Level"
          value={tier.level}
          subtext={`Komisi ${tier.rate}%`}
        />
        <StatBox
          icon={Users}
          label="Total Referral"
          value={String(activeReferrals)}
          subtext={`${totalReferrals} user terdaftar`}
        />
        <Card className="rounded-[1.7rem] border-white/10 bg-white/5">
          <CardContent className="flex h-full items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Total Komisi</p>
              <p className="mt-3 text-4xl font-semibold text-white">
                {formatIdr(availableBalance)}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Minimum penarikan {formatIdr(minimumWithdrawalAmount)}
              </p>
            </div>
            <form action={requestAffiliateWithdrawalAction}>
              <Button
                type="submit"
                variant="secondary"
                disabled={availableBalance < minimumWithdrawalAmount}
              >
                Tarik Komisi
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <AffiliateLinkCard link={referralLink} />
    </div>
  );
}

function HistoryTab({
  totalCommission,
  totalWithdrawn,
  recentWithdrawals,
  recentCommissions,
}: {
  totalCommission: number;
  totalWithdrawn: number;
  recentWithdrawals: Array<{
    id: string;
    amount: number;
    status: string;
    requestedAt: Date;
    reviewedAt: Date | null;
  }>;
  recentCommissions: Array<{
    id: string;
    amount: number;
    commissionRate: number;
    status: string;
    createdAt: Date;
    referredUser: {
      name: string;
      email: string;
    };
  }>;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <StatBox icon={Coins} label="Akumulasi Komisi" value={formatIdr(totalCommission)} subtext="Akumulasi komisi" />
        <StatBox icon={Crown} label="Total Withdraw" value={formatIdr(totalWithdrawn)} subtext="Akumulasi penarikan" />
      </div>

      <Card className="rounded-[1.7rem] border-white/10 bg-white/5">
        <CardContent className="space-y-5 p-5">
          <h2 className="text-xl font-semibold text-white">Riwayat Penarikan</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-3 font-medium">No</th>
                  <th className="px-3 py-3 font-medium">Jumlah</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Tanggal Diajukan</th>
                  <th className="px-3 py-3 font-medium">Tanggal Disetujui</th>
                </tr>
              </thead>
              <tbody>
                {recentWithdrawals.length > 0 ? (
                  recentWithdrawals.map((item, index) => (
                    <tr key={item.id} className="border-b border-white/6 last:border-b-0">
                      <td className="px-3 py-4 text-white">{index + 1}</td>
                      <td className="px-3 py-4 text-white">{formatIdr(item.amount)}</td>
                      <td className="px-3 py-4">
                        <Badge variant={item.status === "rejected" ? "outline" : "default"}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-4 text-[var(--muted)]">{formatDate(item.requestedAt)}</td>
                      <td className="px-3 py-4 text-[var(--muted)]">
                        {item.reviewedAt ? formatDate(item.reviewedAt) : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-[var(--muted)]">
                      Tidak ada riwayat penarikan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.7rem] border-white/10 bg-white/5">
        <CardContent className="space-y-5 p-5">
          <h2 className="text-xl font-semibold text-white">Riwayat Komisi</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-3 font-medium">Referral</th>
                  <th className="px-3 py-3 font-medium">Komisi</th>
                  <th className="px-3 py-3 font-medium">Rate</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {recentCommissions.length > 0 ? (
                  recentCommissions.map((item) => (
                    <tr key={item.id} className="border-b border-white/6 last:border-b-0">
                      <td className="px-3 py-4">
                        <p className="font-medium text-white">{item.referredUser.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {item.referredUser.email}
                        </p>
                      </td>
                      <td className="px-3 py-4 text-white">{formatIdr(item.amount)}</td>
                      <td className="px-3 py-4 text-white">{item.commissionRate}%</td>
                      <td className="px-3 py-4">
                        <Badge variant={item.status === "paid" ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-4 text-[var(--muted)]">{formatDate(item.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-[var(--muted)]">
                      Belum ada komisi affiliate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TipsTab() {
  return (
    <div className="space-y-4">
      <TipsCard
        title="Langkah Cepat Share Referral"
        items={[
          "Salin link referral kamu dan siapkan kalimat ajakan singkat yang konsisten.",
          "Tentukan target audiens yang paling sering menonton short drama dan pilih platform utama.",
          "Sisipi call-to-action yang jelas: daftar, aktifkan VIP, lalu nonton episode premium.",
          "Pakai nama akun dan gaya promosi yang rapi agar mudah dikenali.",
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TipsCard
          title="Strategi TikTok"
          items={[
            "Upload highlight drama pendek 15-30 detik dengan hook yang kuat.",
            "Taruh CTA di caption dan bio agar link referral selalu mudah diakses.",
            "Gunakan hashtag niche drama dan subtitle Indonesia untuk target yang tepat.",
          ]}
        />
        <TipsCard
          title="Strategi YouTube"
          items={[
            "Buat recap singkat, list drama bertema, atau review episode premium.",
            "Sebutkan manfaat VIP dan arahkan penonton ke link referral.",
            "Taruh link di deskripsi, pinned comment, dan end screen.",
          ]}
        />
        <TipsCard
          title="Strategi Instagram"
          items={[
            "Bagikan poster, carousel trivia, atau reels rekomendasi drama terbaru.",
            "Pakai link-in-bio dan highlight story khusus affiliate.",
            "Ajak followers DM bila butuh rekomendasi personal.",
          ]}
        />
        <TipsCard
          title="Strategi Facebook"
          items={[
            "Aktif di grup pecinta drama Asia dan bantu jawab dengan rekomendasi yang relevan.",
            "Bagikan link referral saat membahas drama baru atau episode populer.",
            "Gunakan live atau watch party sederhana sambil mengedukasi soal VIP.",
          ]}
        />
      </div>
    </div>
  );
}

function RulesTab({
  settings,
}: {
  settings: Awaited<ReturnType<typeof getAffiliateSettings>>;
}) {
  return (
    <Card className="rounded-[1.7rem] border-white/10 bg-white/5">
      <CardContent className="space-y-6 p-5">
        <h2 className="text-xl font-semibold text-white">Aturan Program Affiliate</h2>

        <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
          <p className="font-medium text-white">Tingkatan dan Komisi</p>
          <p>
            Bronze: {settings.bronzeMinActiveReferrals}+ referral aktif, komisi{" "}
            {settings.bronzeCommissionRate}%.
          </p>
          <p>
            Silver: {settings.silverMinActiveReferrals}+ referral aktif, komisi{" "}
            {settings.silverCommissionRate}%.
          </p>
          <p>
            Gold: {settings.goldMinActiveReferrals}+ referral aktif, komisi{" "}
            {settings.goldCommissionRate}%.
          </p>
          <p>
            Platinum: {settings.platinumMinActiveReferrals}+ referral aktif, komisi{" "}
            {settings.platinumCommissionRate}%.
          </p>
        </div>

        <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-[var(--muted)]">
          <p className="font-medium text-white">Komisi</p>
          <p>{settings.commissionNotes || "Komisi dihitung dari transaksi VIP yang sudah sukses."}</p>
        </div>

        <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-[var(--muted)]">
          <p className="font-medium text-white">Penarikan</p>
          <p>
            Minimum penarikan {formatIdr(settings.minimumWithdrawalAmount)}.{" "}
            {settings.withdrawalNotes || "Admin akan memeriksa permintaan penarikan secara manual."}
          </p>
        </div>

        <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-[var(--muted)]">
          <p className="font-medium text-white">Ketentuan Lain</p>
          <p>{settings.otherTerms || "Referral aktif dihitung dari user yang sudah membeli VIP minimal satu kali."}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({
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
    <Card className="rounded-[1.7rem] border-white/10 bg-white/5">
      <CardContent className="space-y-3 p-5">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white">
          <Icon className="size-5" />
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
        <p className="text-4xl font-semibold text-white">{value}</p>
        <p className="text-sm text-[var(--muted)]">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function TipsCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="rounded-[1.7rem] border-white/10 bg-white/5">
      <CardContent className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="space-y-2 text-sm leading-7 text-[var(--muted)]">
          {items.map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
