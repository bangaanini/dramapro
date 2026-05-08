import { BellRing, RadioTower, Send, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PushNotificationComposer } from "@/components/admin/push-notification-composer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getWebPushConfig } from "@/lib/push-notifications";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminNotificationsPage() {
  const webPushConfig = getWebPushConfig();
  const [activeSubscribers, guestSubscribers, userSubscribers, dramas, vipPlans, partnerBots, campaigns] =
    await Promise.all([
      prisma.pushSubscription.count({
        where: {
          isActive: true,
        },
      }),
      prisma.pushSubscription.count({
        where: {
          isActive: true,
          userId: null,
        },
      }),
      prisma.pushSubscription.count({
        where: {
          isActive: true,
          userId: {
            not: null,
          },
        },
      }),
      prisma.catalogSeries.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          _count: {
            select: {
              episodes: true,
            },
          },
          chapterCount: true,
          coverUrl: true,
          description: true,
          id: true,
          platform: {
            select: {
              name: true,
            },
          },
          title: true,
        },
        take: 80,
        where: {
          isHomepageVisible: true,
        },
      }),
      prisma.vipPricePlan.findMany({
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            priceAmount: "asc",
          },
        ],
        select: {
          durationDays: true,
          id: true,
          name: true,
          priceAmount: true,
        },
        where: {
          isActive: true,
        },
      }),
      prisma.telegramPartnerBot.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          botUsername: true,
          id: true,
          owner: {
            select: {
              name: true,
            },
          },
        },
        where: {
          isEnabled: true,
        },
      }),
      prisma.pushNotificationCampaign.findMany({
        include: {
          createdByAdminUser: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      }),
    ]);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <BellRing className="mr-2 size-3.5" />
          PWA notification
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Notifications
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--muted)]">
          Kirim notifikasi ke device yang sudah mengaktifkan Web Push. Campaign
          masuk queue dulu lalu dikirim oleh worker agar dashboard tetap ringan.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Smartphone}
          label="Subscriber aktif"
          value={formatNumber(activeSubscribers)}
        />
        <StatTile
          icon={RadioTower}
          label="Guest subscriber"
          value={formatNumber(guestSubscribers)}
        />
        <StatTile
          icon={Send}
          label="User subscriber"
          value={formatNumber(userSubscribers)}
        />
      </section>

      <PushNotificationComposer
        dramas={dramas.map((drama) => ({
          coverUrl: drama.coverUrl,
          description: drama.description,
          episodeCount: drama.chapterCount || drama._count.episodes,
          id: drama.id,
          providerName: drama.platform.name,
          title: drama.title,
        }))}
        isPushConfigured={webPushConfig.enabled}
        partnerBots={partnerBots.map((bot) => ({
          botUsername: bot.botUsername,
          id: bot.id,
          ownerName: bot.owner.name,
        }))}
        vipPlans={vipPlans}
      />

      <Card className="glass-panel rounded-[2rem] border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Riwayat campaign</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Menampilkan 12 campaign terbaru.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{campaign.type}</Badge>
                      <Badge
                        className={
                          campaign.status === "failed"
                            ? "border-red-400/20 bg-red-500/10 text-red-100"
                            : campaign.status === "sent"
                              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                              : "border-amber-400/20 bg-amber-500/10 text-amber-100"
                        }
                      >
                        {campaign.status}
                      </Badge>
                      <span className="text-xs text-[var(--muted)]">
                        {formatDate(campaign.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 truncate text-base font-semibold text-white">
                      {campaign.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                      {campaign.body}
                    </p>
                    {campaign.lastError ? (
                      <p className="mt-2 text-xs text-red-200/80">{campaign.lastError}</p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs sm:w-[24rem]">
                    <MiniCounter label="Target" value={campaign.totalTargets} />
                    <MiniCounter label="Queue" value={campaign.queuedCount} />
                    <MiniCounter label="Sent" value={campaign.sentCount} />
                    <MiniCounter label="Failed" value={campaign.failedCount} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-[var(--muted)]">
                Belum ada campaign notifikasi.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="glass-panel rounded-[1.6rem] border-white/10">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/42">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{formatNumber(value)}</p>
    </div>
  );
}
