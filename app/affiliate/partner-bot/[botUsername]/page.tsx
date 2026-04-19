import { Bot, MessageCircleMore, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { PartnerBotMessageEditor } from "@/components/partner-bot-message-editor";
import { Badge } from "@/components/ui/badge";
import {
  getAppSettings,
  normalizeTelegramInlineButtons,
} from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { normalizeTelegramBotUsername } from "@/lib/telegram-partner-bots";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

const PARTNER_BOX_OFFICE_INLINE_BUTTON_INDEX = 4;

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
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const partnerBot = await prisma.telegramPartnerBot.findFirst({
    where: {
      botUsername: normalizedBotUsername,
      ownerUserId: user.id,
    },
    select: {
      boxOfficeBotUrl: true,
      botUsername: true,
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

  return (
    <main className="route-transition-shell mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 pb-24 pt-4 sm:px-5 sm:pt-6">
      <section className="space-y-6">
        <section className="glass-panel rounded-[2rem] border border-white/10 p-6">
          <Badge className="border-accent/30 bg-accent-soft text-accent">
            <Sparkles className="mr-2 size-3.5" />
            Partner bot
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Sambutan dan keyboard @{partnerBot.botUsername}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            Halaman ini hanya bisa diakses oleh pemilik bot partner. Semua URL
            tombol akan divalidasi supaya tetap cocok dengan aturan Telegram.
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

        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(26,18,16,0.96),rgba(13,9,8,0.98))] p-5 text-sm leading-7 text-[var(--muted)]">
          <div className="flex items-center gap-2 text-white">
            <MessageCircleMore className="size-4 text-accent" />
            Placeholder yang didukung
          </div>
          <p className="mt-2">
            Gunakan <span className="font-medium text-white">{"{name}"}</span>{" "}
            untuk nama Telegram user,{" "}
            <span className="font-medium text-white">{"{botName}"}</span> untuk
            nama bot partner aktif, dan{" "}
            <span className="font-medium text-white">{"{siteName}"}</span> untuk
            brand aplikasi. Jika URL tombol memakai domain Mini App yang sama,
            Telegram akan membukanya langsung sebagai Mini App.
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
      </section>
    </main>
  );
}
