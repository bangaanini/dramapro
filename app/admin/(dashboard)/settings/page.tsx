import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  Link2,
  MessageCircleMore,
  SearchCheck,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { saveTelegramSettingsAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage(
  props: PageProps<"/admin/settings">,
) {
  const searchParams = await props.searchParams;
  const saved = typeof searchParams.saved === "string" ? searchParams.saved : "";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const settings = await getAppSettings();
  const site = settings.site;
  const telegram = settings.telegram;

  const setupChecklist = [
    {
      label: "Bot token",
      ready: Boolean(telegram.botToken),
      description: "Ambil dari BotFather > API Token",
    },
    {
      label: "Bot username",
      ready: Boolean(telegram.botUsername),
      description: "Gunakan username bot tanpa @",
    },
    {
      label: "Webhook secret",
      ready: Boolean(telegram.webhookSecret),
      description: "Secret tambahan agar webhook lebih aman",
    },
    {
      label: "Mini App URL",
      ready: Boolean(telegram.miniAppUrl),
      description: "Tempel juga ke pengaturan Mini App di BotFather",
    },
  ];

  const missingTelegramFields = setupChecklist
    .filter((item) => !item.ready)
    .map((item) => item.label);

  const setWebhookCommand =
    telegram.botToken && telegram.webhookSecret
      ? [
          `curl -X POST "https://api.telegram.org/bot${telegram.botToken}/setWebhook" \\`,
          '  -H "Content-Type: application/json" \\',
          "  -d '{",
          `    "url": "${telegram.webhookUrl}",`,
          `    "secret_token": "${telegram.webhookSecret}",`,
          '    "allowed_updates": ["message"]',
          "  }'",
        ].join("\n")
      : "Lengkapi bot token dan webhook secret untuk menampilkan command setWebhook.";

  const getWebhookInfoCommand = telegram.botToken
    ? `curl "https://api.telegram.org/bot${telegram.botToken}/getWebhookInfo"`
    : "Lengkapi bot token untuk menampilkan command getWebhookInfo.";

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <Sparkles className="mr-2 size-3.5" />
          Bot settings
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Bot utama, webhook, dan Mini App
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Halaman ini sekarang fokus hanya untuk runtime bot utama. Pesan
          sambutan dan 10 tombol inline sudah dipisah ke halaman khusus supaya
          pengaturan bot lebih cepat dibaca dan tidak bercampur dengan SEO.
        </p>
        <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3 text-sm text-[var(--muted)]">
          Secret Telegram tetap disimpan terenkripsi. Server masih membutuhkan{" "}
          <span className="font-semibold text-white">PAYMENT_CREDENTIALS_KEY</span>{" "}
          agar token dan webhook secret bisa dienkripsi/dekripsi.
        </div>
      </section>

      {saved ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Pengaturan bot utama berhasil disimpan.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <ShortcutCard
          href="/admin/bot-message"
          icon={MessageCircleMore}
          badge="Pesan bot"
          title="Sambutan dan 10 tombol inline"
          description="Edit /start, tombol keyboard, dan preview live seperti pola BoxOffice."
        />
        <ShortcutCard
          href="/admin/seo"
          icon={SearchCheck}
          badge="SEO web"
          title="Branding dan metadata"
          description={`Atur nama situs, logo, deskripsi, dan URL publik ${site.name}.`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-6 p-6">
            <div>
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                <Bot className="mr-2 size-3.5" />
                Integrasi Telegram
              </Badge>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Bot utama dan command webhook
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Isi data dari BotFather sekali, lalu panel ini akan menyiapkan
                Mini App URL, support URL, channel default broadcast, dan
                command webhook yang siap dipakai.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {setupChecklist.map((item) => (
                <StatusTile
                  key={item.label}
                  label={item.label}
                  value={item.ready ? "Siap" : "Belum"}
                  description={item.description}
                  tone={item.ready ? "success" : "muted"}
                />
              ))}
            </div>

            {missingTelegramFields.length > 0 ? (
              <div className="rounded-[1.4rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Lengkapi dulu: {missingTelegramFields.join(", ")}.
              </div>
            ) : null}

            <form action={saveTelegramSettingsAction} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Telegram bot token"
                  name="botToken"
                  type="password"
                  placeholder={
                    settings.raw?.telegramBotTokenCiphertext
                      ? "Kosongkan untuk mempertahankan token tersimpan"
                      : "Masukkan token dari BotFather"
                  }
                />
                <Field
                  label="Telegram bot username"
                  name="botUsername"
                  defaultValue={telegram.botUsername ?? ""}
                  placeholder="contoh: Dramapro_bot"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Telegram webhook secret"
                  name="webhookSecret"
                  type="password"
                  placeholder={
                    settings.raw?.telegramWebhookSecretCiphertext
                      ? "Kosongkan untuk mempertahankan secret tersimpan"
                      : "Secret tambahan untuk webhook"
                  }
                />
                <Field
                  label="Telegram support URL"
                  name="telegramSupportUrl"
                  defaultValue={telegram.supportUrl}
                  placeholder="https://t.me/username-support"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Telegram Mini App URL"
                  name="telegramMiniAppUrl"
                  defaultValue={telegram.miniAppUrl}
                  placeholder="https://domainmu.com/"
                />
                <Field
                  label="Channel default broadcast bot utama"
                  name="telegramDefaultBroadcastChannel"
                  defaultValue={telegram.defaultBroadcastChannel}
                  placeholder="@channelutama atau https://t.me/channelutama"
                />
              </div>

              <Button type="submit" className="w-full sm:w-fit">
                Simpan pengaturan bot
              </Button>
            </form>

            <div className="grid gap-4 lg:grid-cols-2">
              <InfoBlock
                icon={Link2}
                title="Preview URL penting"
                lines={[
                  `Mini App: ${telegram.miniAppUrl}`,
                  `Support: ${telegram.supportUrl}`,
                  `Broadcast channel: ${telegram.defaultBroadcastChannel || "belum diatur"}`,
                  `Webhook: ${telegram.webhookUrl}`,
                  telegram.botUsername
                    ? `Bot link: https://t.me/${telegram.botUsername}`
                    : "Bot link: isi username bot terlebih dahulu",
                ]}
              />

              <InfoBlock
                icon={ShieldCheck}
                title="Petunjuk BotFather"
                lines={[
                  "1. Buat bot lalu salin API token ke field bot token.",
                  "2. Isi username bot tanpa simbol @.",
                  "3. Tempel Mini App URL ke menu Mini Apps > Main App.",
                  "4. Jalankan curl setWebhook setelah token + secret terisi.",
                ]}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-panel rounded-[2rem] border-white/10">
            <CardContent className="space-y-4 p-6">
              <div>
                <Badge className="border-accent/30 bg-accent-soft text-accent">
                  <Settings2 className="mr-2 size-3.5" />
                  Runtime overview
                </Badge>
                <h2 className="mt-4 text-2xl font-semibold text-white">
                  Nilai aktif saat ini
                </h2>
              </div>

              <InfoBlock
                icon={CheckCircle2}
                title="Bot utama"
                lines={[
                  `Brand: ${site.name}`,
                  `Bot aktif: ${telegram.botUsername ? `@${telegram.botUsername}` : "belum diatur"}`,
                  `Main App URL: ${telegram.miniAppUrl}`,
                  `Webhook URL: ${telegram.webhookUrl}`,
                ]}
              />

              <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3 text-sm text-[var(--muted)]">
                Pesan sambutan dan keyboard sekarang dipisah ke{" "}
                <Link
                  href="/admin/bot-message"
                  className="font-medium text-white underline decoration-white/20 underline-offset-4"
                >
                  halaman Pesan Bot
                </Link>
                . Metadata web pindah ke{" "}
                <Link
                  href="/admin/seo"
                  className="font-medium text-white underline decoration-white/20 underline-offset-4"
                >
                  halaman SEO
                </Link>
                .
              </div>
            </CardContent>
          </Card>

          <CodeBlock
            title="Command setWebhook"
            value={setWebhookCommand}
          />
          <CodeBlock
            title="Command getWebhookInfo"
            value={getWebhookInfoCommand}
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder: string;
  type?: "text" | "password" | "url";
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
      />
    </label>
  );
}

function StatusTile({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: "muted" | "success";
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/4 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-3 text-base font-semibold ${
          tone === "success" ? "text-emerald-200" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  badge,
  title,
  description,
}: {
  href: string;
  icon: typeof Bot;
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="glass-panel block rounded-[2rem] border border-white/10 p-5 transition hover:border-white/20 hover:bg-white/[0.04]"
    >
      <Badge className="border-accent/30 bg-accent-soft text-accent">
        <Icon className="mr-2 size-3.5" />
        {badge}
      </Badge>
      <h2 className="mt-4 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
        {description}
      </p>
    </Link>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  lines,
}: {
  icon: typeof Bot;
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-accent" />
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--muted)]">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function CodeBlock({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <Card className="glass-panel rounded-[2rem] border-white/10">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-accent" />
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <pre className="overflow-x-auto rounded-[1.4rem] border border-white/10 bg-black/25 p-4 text-xs leading-6 text-neutral-200">
          <code>{value}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
