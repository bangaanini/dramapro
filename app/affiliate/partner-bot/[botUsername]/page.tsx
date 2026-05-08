import Link from "next/link";
import { Bot, MessageCircleMore, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { PartnerBotBalance } from "@/components/partner-bot-balance";
import { PartnerBotDashboard } from "@/components/partner-bot-dashboard";
import { PartnerBotMessageEditor } from "@/components/partner-bot-message-editor";
import { PartnerBotDownloadPanel } from "@/components/partner-bot-download-panel";
import { PartnerBotRevenue } from "@/components/partner-bot-revenue";
import { PartnerBotUsers } from "@/components/partner-bot-users";
import { Badge } from "@/components/ui/badge";
import {
  getAppSettings,
  normalizeTelegramInlineButtons,
} from "@/lib/app-settings";
import { getPartnerBotAnalyticsDashboard } from "@/lib/partner-bot-analytics";
import {
  getPartnerBotBalanceDashboard,
  getPartnerBotRevenueDashboard,
} from "@/lib/partner-bot-revenue";
import { getPartnerBotUsersDashboard } from "@/lib/partner-bot-users";
import { getPartnerDownloadQuota } from "@/lib/partner-downloads";
import { prisma } from "@/lib/prisma";
import { normalizeTelegramBotUsername } from "@/lib/telegram-partner-bots";
import { getCurrentUser } from "@/lib/user-auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PARTNER_BOX_OFFICE_INLINE_BUTTON_INDEX = 4;
const PARTNER_BOT_TABS = [
  "dashboard",
  "revenue",
  "balance",
  "users",
  "download",
  "message",
] as const;

type PartnerBotTab = (typeof PARTNER_BOT_TABS)[number];

function parsePartnerBotTab(value: unknown): PartnerBotTab {
  return PARTNER_BOT_TABS.includes(value as PartnerBotTab)
    ? (value as PartnerBotTab)
    : "dashboard";
}

export default async function AffiliatePartnerBotSettingsPage(
  props: PageProps<"/affiliate/partner-bot/[botUsername]">,
) {
  const user = await getCurrentUser();

  if (!user) {
    const { botUsername } = await props.params;
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/affiliate/partner-bot/${normalizeTelegramBotUsername(botUsername)}`,
      )}`,
    );
  }

  const [{ botUsername }, searchParams, settings] = await Promise.all([
    props.params,
    props.searchParams,
    getAppSettings(),
  ]);
  const normalizedBotUsername = normalizeTelegramBotUsername(botUsername);
  const saved =
    typeof searchParams.saved === "string" ? searchParams.saved : "";
  const success =
    typeof searchParams.success === "string"
      ? searchParams.success
      : typeof searchParams.payoutSuccess === "string"
        ? searchParams.payoutSuccess
        : "";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const activeTab = saved ? "message" : parsePartnerBotTab(searchParams.tab);
  const partnerBot = await prisma.telegramPartnerBot.findFirst({
    where: {
      botUsername: normalizedBotUsername,
      ownerUserId: user.id,
    },
    select: {
      id: true,
      boxOfficeBotUrl: true,
      botUsername: true,
      downloadDailyLimit: true,
      downloadEnabled: true,
      inlineButtons: true,
      isEnabled: true,
      welcomeMessage: true,
    },
  });

  if (!partnerBot) {
    redirect("/affiliate?error=Bot%20partner%20tidak%20ditemukan");
  }

  const baseButtons = normalizeTelegramInlineButtons(
    partnerBot.inlineButtons,
    settings.telegram.inlineButtons,
  );
  const initialButtons = Array.isArray(partnerBot.inlineButtons)
    ? baseButtons
    : baseButtons.map((button, index) =>
        index === PARTNER_BOX_OFFICE_INLINE_BUTTON_INDEX &&
        partnerBot.boxOfficeBotUrl.trim()
          ? {
              ...button,
              url: partnerBot.boxOfficeBotUrl,
            }
          : button,
      );
  const initialWelcomeMessage =
    partnerBot.welcomeMessage.trim() || settings.telegram.menu.welcomeMessage;
  const dashboard =
    activeTab === "dashboard"
      ? await getPartnerBotAnalyticsDashboard({
          partnerBotId: partnerBot.id,
          range: searchParams.range,
          source: searchParams.source,
        })
      : null;
  const revenue =
    activeTab === "revenue"
      ? await getPartnerBotRevenueDashboard({
          partnerBotId: partnerBot.id,
          range: searchParams.range,
        })
      : null;
  const balance =
    activeTab === "balance"
      ? await getPartnerBotBalanceDashboard({
          ownerUserId: user.id,
          partnerBotId: partnerBot.id,
          balanceView: searchParams.balanceView,
        })
      : null;
  const users =
    activeTab === "users"
      ? await getPartnerBotUsersDashboard({
          partnerBotId: partnerBot.id,
        })
      : null;
  const downloadQuota =
    activeTab === "download"
      ? await getPartnerDownloadQuota({ bot: partnerBot, userId: user.id })
      : null;
  const tabItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: `/affiliate/partner-bot/${partnerBot.botUsername}?tab=dashboard`,
    },
    {
      key: "revenue",
      label: "Revenue",
      href: `/affiliate/partner-bot/${partnerBot.botUsername}?tab=revenue`,
    },
    {
      key: "balance",
      label: "Balance",
      href: `/affiliate/partner-bot/${partnerBot.botUsername}?tab=balance`,
    },
    {
      key: "users",
      label: "Users",
      href: `/affiliate/partner-bot/${partnerBot.botUsername}?tab=users`,
    },
    {
      key: "download",
      label: "Download",
      href: `/affiliate/partner-bot/${partnerBot.botUsername}?tab=download`,
    },
    {
      key: "message",
      label: "Pesan",
      href: `/affiliate/partner-bot/${partnerBot.botUsername}?tab=message`,
    },
  ];

  return (
    <main className="route-transition-shell mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 pb-24 pt-4 sm:px-5 sm:pt-6">
      <section className="space-y-6">
        <section className="glass-panel rounded-[1.65rem] border border-white/10 p-4 md:rounded-[2rem] md:p-6">
          <Badge className="border-accent/30 bg-accent-soft text-accent">
            <Sparkles className="mr-2 size-3.5" />
            Partner bot
          </Badge>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Dashboard dan pengaturan @{partnerBot.botUsername}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            Pantau traffic bot partner, video views, retention, lalu atur pesan
            sambutan dan keyboard dari satu halaman.
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white">
              <Bot className="mr-2 inline size-4 text-accent" />
              @{partnerBot.botUsername}
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              Status: {partnerBot.isEnabled ? "Aktif" : "Nonaktif"}
            </div>
          </div>
        </section>

        <nav
          className="admin-mobile-tabs sticky top-3 z-20 flex w-full max-w-full gap-7 overflow-x-auto overflow-y-hidden rounded-[1.25rem] border border-white/10 bg-[#08080a]/88 px-4 pb-3 pt-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl"
          aria-label="Navigasi partner bot"
        >
          {tabItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "relative shrink-0 pb-3 text-[1.05rem] font-semibold leading-none transition",
                item.key === activeTab
                  ? "text-white"
                  : "text-[rgba(255,255,255,0.42)] hover:text-white",
              )}
            >
              {item.label}
              {item.key === activeTab ? (
                <span className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-white" />
              ) : null}
            </Link>
          ))}
        </nav>

        {saved ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {saved}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        {activeTab === "dashboard" && dashboard ? (
          <PartnerBotDashboard
            botUsername={partnerBot.botUsername}
            dashboard={dashboard}
          />
        ) : activeTab === "revenue" && revenue ? (
          <PartnerBotRevenue
            botUsername={partnerBot.botUsername}
            dashboard={revenue}
          />
        ) : activeTab === "balance" && balance ? (
          <PartnerBotBalance
            botUsername={partnerBot.botUsername}
            dashboard={balance}
          />
        ) : activeTab === "users" && users ? (
          <PartnerBotUsers
            botUsername={partnerBot.botUsername}
            dashboard={users}
          />
        ) : activeTab === "download" ? (
          downloadQuota?.enabled ? (
            <PartnerBotDownloadPanel
              bots={[
                {
                  botUsername: partnerBot.botUsername,
                  dailyLimit: downloadQuota.dailyLimit,
                  enabled: downloadQuota.enabled,
                  id: partnerBot.id,
                  remaining: downloadQuota.remaining,
                  used: downloadQuota.used,
                },
              ]}
              title={`Download episode dari @${partnerBot.botUsername}`}
            />
          ) : (
            <div className="rounded-[1.65rem] border border-white/10 bg-[#171719] p-5 text-sm leading-7 text-[var(--muted)] md:rounded-[2rem]">
              Fitur download partner belum diaktifkan admin untuk bot ini.
            </div>
          )
        ) : (
          <>
            <div className="rounded-[1.65rem] border border-white/10 bg-[#171719] p-5 text-sm leading-7 text-[var(--muted)] md:rounded-[2rem]">
              <div className="flex items-center gap-2 text-white">
                <MessageCircleMore className="size-4 text-accent" />
                Placeholder yang didukung
              </div>
              <p className="mt-2">
                Gunakan{" "}
                <span className="font-medium text-white">{"{name}"}</span>{" "}
                untuk nama Telegram user,{" "}
                <span className="font-medium text-white">{"{botName}"}</span>{" "}
                untuk nama bot partner aktif, dan{" "}
                <span className="font-medium text-white">{"{siteName}"}</span>{" "}
                untuk brand aplikasi. Jika URL tombol memakai domain Mini App
                yang sama, Telegram akan membukanya langsung sebagai Mini App.
              </p>
            </div>

            <PartnerBotMessageEditor
              botUsername={partnerBot.botUsername}
              initialButtons={initialButtons}
              initialWelcomeMessage={initialWelcomeMessage}
              previewDescription={settings.site.description}
              previewHost={settings.site.url.replace(/^https?:\/\//, "")}
              previewTitle={settings.site.title}
            />
          </>
        )}
      </section>
    </main>
  );
}
