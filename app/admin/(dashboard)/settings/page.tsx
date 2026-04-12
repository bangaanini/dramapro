import {
  Bot,
  CheckCircle2,
  Globe,
  ImageIcon,
  Link2,
  MessageCircleMore,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  saveSeoSettingsAction,
  saveTelegramSettingsAction,
} from "@/app/admin/actions";
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

  const brandPreviewLogo = settings.raw?.siteLogoUrl?.trim() || null;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <Sparkles className="mr-2 size-3.5" />
          Settings
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Telegram + SEO Settings
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Panel ini menyimpan konfigurasi aplikasi di database, jadi admin bisa
          mengatur branding web dan integrasi Telegram tanpa mengedit file{" "}
          <span className="font-medium text-white">.env</span> server. Nilai dari
          database akan dipakai lebih dulu, lalu fallback ke env, lalu default app.
        </p>
        <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3 text-sm text-[var(--muted)]">
          Secret Telegram tetap disimpan terenkripsi. Server masih membutuhkan{" "}
          <span className="font-semibold text-white">PAYMENT_CREDENTIALS_KEY</span>{" "}
          agar token dan webhook secret bisa dienkripsi/dekripsi.
        </div>
      </section>

      {saved ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {saved === "telegram"
            ? "Pengaturan Telegram berhasil disimpan."
            : "Pengaturan SEO berhasil disimpan."}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-6 p-6">
            <div>
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                <Bot className="mr-2 size-3.5" />
                Integrasi Telegram
              </Badge>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Bot, webhook, dan Mini App
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Isi data dari BotFather sekali, lalu panel ini akan menyiapkan
                URL Mini App, support, dan command webhook yang siap dipakai.
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
                  label="Site/Public URL"
                  name="siteUrl"
                  defaultValue={site.url}
                  placeholder="https://domainmu.com"
                />
              </div>

              <Button type="submit" className="w-full sm:w-fit">
                Simpan pengaturan Telegram
              </Button>
            </form>

            <div className="grid gap-4 lg:grid-cols-2">
              <InfoBlock
                icon={Link2}
                title="Preview URL penting"
                lines={[
                  `Mini App: ${telegram.miniAppUrl}`,
                  `Support: ${telegram.supportUrl}`,
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

            <CodeBlock
              title="Command setWebhook"
              value={setWebhookCommand}
            />
            <CodeBlock
              title="Command getWebhookInfo"
              value={getWebhookInfoCommand}
            />
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-6 p-6">
            <div>
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                <SearchCheck className="mr-2 size-3.5" />
                SEO Web
              </Badge>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Branding dan metadata utama
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Nilai di panel ini dipakai untuk metadata, Open Graph, sitemap,
                robots, dan branding header web biasa.
              </p>
            </div>

            <form action={saveSeoSettingsAction} className="space-y-4">
              <Field
                label="URL situs"
                name="siteUrl"
                defaultValue={site.url}
                placeholder="https://domainmu.com"
              />
              <Field
                label="Nama situs"
                name="siteName"
                defaultValue={site.name}
                placeholder="Layar Drama"
              />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">
                  Deskripsi situs
                </span>
                <textarea
                  name="siteDescription"
                  rows={4}
                  defaultValue={site.description}
                  placeholder="Deskripsi singkat situs untuk SEO"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>
              <Field
                label="Logo situs URL"
                name="siteLogoUrl"
                defaultValue={settings.raw?.siteLogoUrl ?? ""}
                placeholder="https://domainmu.com/logo.png"
              />

              <Button type="submit" className="w-full sm:w-fit">
                Simpan pengaturan SEO
              </Button>
            </form>

            <div className="space-y-4">
              <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,145,46,0.15),rgba(255,255,255,0.03))] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                  Preview brand header
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25 text-white">
                    {brandPreviewLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brandPreviewLogo}
                        alt={site.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {site.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {site.url}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.7rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                  Preview metadata
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {site.title}
                    </p>
                    <p className="text-xs text-emerald-300">{site.url}</p>
                  </div>
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    {site.description}
                  </p>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--muted-foreground)]">
                    Open Graph image: {site.logoUrl}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3 text-sm text-[var(--muted)]">
                Logo v1 memakai URL + preview. Di fase berikutnya kita bisa
                tambah upload file tanpa perlu mengubah struktur pengaturan ini.
              </div>
            </div>
          </CardContent>
        </Card>
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
  tone: "success" | "muted";
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/4 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white">{label}</p>
        <Badge
          className={
            tone === "success"
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
              : "border-white/10 bg-white/6 text-[var(--muted)]"
          }
        >
          {tone === "success" ? <CheckCircle2 className="mr-1.5 size-3.5" /> : null}
          {value}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  lines,
}: {
  icon: typeof Globe;
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
      <div className="flex items-center gap-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-2 text-accent">
          <Icon className="size-4" />
        </div>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function CodeBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-2">
        <MessageCircleMore className="size-4 text-accent" />
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-[1.2rem] border border-white/10 bg-black/35 px-4 py-3 text-xs leading-6 text-[var(--muted)]">
        <code>{value}</code>
      </pre>
    </div>
  );
}
