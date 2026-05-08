import {
  Bot,
  Copy,
  ExternalLink,
  Link2,
  PlusCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  createTelegramPartnerBotAction,
  deleteTelegramPartnerBotAction,
  updateTelegramPartnerBotAction,
} from "@/app/admin/actions";
import { OwnerAffiliateCombobox } from "@/components/admin/owner-affiliate-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTelegramPartnerBotAdminRows } from "@/lib/telegram-partner-bots";
import { cn } from "@/lib/utils";
import { getUserSecondaryLabel } from "@/lib/user-identity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTelegramBotsPage(
  props: PageProps<"/admin/telegram-bots">,
) {
  const searchParams = await props.searchParams;
  const saved = typeof searchParams.saved === "string" ? searchParams.saved : "";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const [partnerBots, owners] = await Promise.all([
    getTelegramPartnerBotAdminRows(),
    prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 1000,
      select: {
        id: true,
        name: true,
        email: true,
        telegramUsername: true,
        authProvider: true,
        affiliateCode: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <Bot className="mr-2 size-3.5" />
          Partner bot referral
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Telegram Partner Bots
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Hubungkan bot Telegram milik affiliate ke Mini App Layar Drama. Setiap
          user baru yang masuk dari bot partner akan otomatis menjadi referral
          owner bot tersebut, selama user belum punya referrer sebelumnya.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatTile label="Total bot" value={String(partnerBots.length)} />
          <StatTile
            label="Aktif"
            value={String(partnerBots.filter((bot) => bot.isEnabled).length)}
          />
          <StatTile
            label="Download aktif"
            value={String(partnerBots.filter((bot) => bot.downloadEnabled).length)}
          />
        </div>
      </section>

      {saved ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Konfigurasi bot partner berhasil disimpan.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <Card className="glass-panel rounded-[2rem] border-white/10">
        <CardContent className="space-y-5 p-6">
          <div>
            <Badge className="border-accent/30 bg-accent-soft text-accent">
              <PlusCircle className="mr-2 size-3.5" />
              Tambah partner bot
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              Bot baru untuk affiliate
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Isi token dari BotFather, pilih owner referral, lalu pasang Mini
              App URL dan webhook yang muncul di kartu bot setelah tersimpan.
            </p>
          </div>

          <form action={createTelegramPartnerBotAction} className="grid gap-4">
            <DownloadSettingsFields />

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Bot username"
                name="botUsername"
                placeholder="contoh: partner_drama_bot"
              />
              <OwnerSelect owners={owners} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Bot token"
                name="botToken"
                type="password"
                placeholder="Token dari BotFather"
              />
              <Field
                label="Channel default partner"
                name="defaultChannelUsername"
                placeholder="@channelpartner atau https://t.me/channelpartner"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Webhook secret"
                name="webhookSecret"
                type="password"
                placeholder="Secret khusus bot partner"
              />
              <Field
                label="Link bot Box Office"
                name="boxOfficeBotUrl"
                placeholder="https://t.me/BoxOficebot?startapp=..."
              />
            </div>

            <Textarea
              label="Catatan"
              name="notes"
              placeholder="Contoh: bot milik affiliate A, target TikTok, dsb."
            />

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
              <input
                type="checkbox"
                name="isEnabled"
                defaultChecked
                className="size-4 accent-[var(--accent)]"
              />
              Aktifkan bot setelah dibuat
            </label>

            <Button type="submit" className="w-full md:w-fit">
              Tambahkan bot partner
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {partnerBots.length > 0 ? (
          partnerBots.map((bot) => (
            <Card
              key={bot.id}
              className="glass-panel rounded-[2rem] border-white/10"
            >
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-white">
                        @{bot.botUsername}
                      </h2>
                      <Badge
                        className={cn(
                          "border-white/10",
                          bot.isEnabled
                            ? "bg-emerald-500/10 text-emerald-100"
                            : "bg-white/6 text-[var(--muted)]",
                        )}
                      >
                        {bot.isEnabled ? "Aktif" : "Nonaktif"}
                      </Badge>
                      <Badge className="border-accent/30 bg-accent-soft text-accent">
                        Owner: {bot.owner.name}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {getUserSecondaryLabel(bot.owner)} · kode affiliate{" "}
                      {bot.owner.affiliateCode ?? "belum tersedia"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Channel default: {bot.defaultChannelUsername || "belum diatur"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Link Box Office: {bot.boxOfficeBotUrl || "belum diatur"}
                    </p>
                    {bot.notes ? (
                      <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--muted)]">
                        {bot.notes}
                      </p>
                    ) : null}
                    <div className="mt-3 inline-flex rounded-full border border-accent/25 bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
                      Download partner:{" "}
                      {bot.downloadEnabled
                        ? `${bot.downloadDailyLimit} episode/hari`
                        : "nonaktif"}
                    </div>
                  </div>

                  <form action={deleteTelegramPartnerBotAction}>
                    <input type="hidden" name="id" value={bot.id} />
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
                </div>

                {bot.credentialError ? (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {bot.credentialError}
                  </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  <InfoBox
                    icon={Link2}
                    title="Mini App URL BotFather"
                    value={bot.miniAppUrl}
                  />
                  <InfoBox
                    icon={ShieldCheck}
                    title="Webhook URL Partner"
                    value={bot.webhookUrl}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <CommandBlock
                    title="setWebhook"
                    command={buildSetWebhookCommand({
                      botToken: bot.botToken,
                      webhookSecret: bot.webhookSecret,
                      webhookUrl: bot.webhookUrl,
                    })}
                  />
                  <CommandBlock
                    title="getWebhookInfo"
                    command={
                      bot.botToken
                        ? `curl "https://api.telegram.org/bot${bot.botToken}/getWebhookInfo"`
                        : "Token tidak bisa ditampilkan karena credential gagal didekripsi."
                    }
                  />
                </div>

                <form
                  action={updateTelegramPartnerBotAction}
                  className="grid gap-4 rounded-[1.7rem] border border-white/10 bg-black/20 p-4"
                >
                  <input type="hidden" name="id" value={bot.id} />
                  <DownloadSettingsFields
                    defaultEnabled={bot.downloadEnabled}
                    defaultLimit={bot.downloadDailyLimit}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Bot username"
                      name="botUsername"
                      defaultValue={bot.botUsername}
                    />
                    <OwnerSelect owners={owners} defaultValue={bot.ownerUserId} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Bot token"
                      name="botToken"
                      type="password"
                      placeholder="Kosongkan untuk mempertahankan token"
                    />
                    <Field
                      label="Channel default partner"
                      name="defaultChannelUsername"
                      defaultValue={bot.defaultChannelUsername}
                      placeholder="@channelpartner atau https://t.me/channelpartner"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Webhook secret"
                      name="webhookSecret"
                      type="password"
                      placeholder="Kosongkan untuk mempertahankan secret"
                    />
                    <Field
                      label="Link bot Box Office"
                      name="boxOfficeBotUrl"
                      defaultValue={bot.boxOfficeBotUrl}
                      placeholder="https://t.me/BoxOficebot?startapp=..."
                    />
                  </div>
                  <Textarea
                    label="Catatan"
                    name="notes"
                    defaultValue={bot.notes}
                  />
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                    <input
                      type="checkbox"
                      name="isEnabled"
                      defaultChecked={bot.isEnabled}
                      className="size-4 accent-[var(--accent)]"
                    />
                    Bot aktif dan bisa dipakai checkout Mini App/referral
                  </label>
                  <Button type="submit" className="w-full md:w-fit">
                    Simpan perubahan bot
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="glass-panel rounded-[2rem] border-white/10">
            <CardContent className="p-8 text-center text-[var(--muted)]">
              Belum ada partner bot. Tambahkan bot pertama untuk membuka jalur
              referral affiliate lewat bot pribadi.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function buildSetWebhookCommand(input: {
  botToken: string | null;
  webhookUrl: string;
  webhookSecret: string | null;
}) {
  if (!input.botToken) {
    return "Token tidak bisa ditampilkan karena credential gagal didekripsi.";
  }

  const payload: Record<string, unknown> = {
    url: input.webhookUrl,
    allowed_updates: ["message"],
  };

  if (input.webhookSecret) {
    payload.secret_token = input.webhookSecret;
  }

  return [
    `curl -X POST "https://api.telegram.org/bot${input.botToken}/setWebhook" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '${JSON.stringify(payload, null, 2)}'`,
  ].join("\n");
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function DownloadSettingsFields({
  defaultEnabled = false,
  defaultLimit = 5,
}: {
  defaultEnabled?: boolean;
  defaultLimit?: number;
}) {
  return (
    <div className="grid gap-4 rounded-[1.5rem] border border-accent/25 bg-accent-soft/50 p-4 md:grid-cols-[minmax(0,1fr)_190px] md:items-center">
      <label className="flex items-start gap-3 text-sm text-white">
        <input
          type="checkbox"
          name="downloadEnabled"
          defaultChecked={defaultEnabled}
          className="mt-1 size-4 accent-[var(--accent)]"
        />
        <span>
          <span className="block font-semibold">Aktifkan download partner</span>
          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
            Owner bot bisa download episode dari detail dan dashboard partner,
            mengikuti limit harian di samping.
          </span>
        </span>
      </label>

      <Field
        label="Limit episode/hari"
        name="downloadDailyLimit"
        type="number"
        defaultValue={String(defaultLimit || 0)}
        placeholder="5"
      />
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-white">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-12 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/50"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-white">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={3}
        className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/50"
      />
    </label>
  );
}

function OwnerSelect({
  owners,
  defaultValue,
}: {
  owners: Array<{
    id: string;
    name: string;
    email: string | null;
    telegramUsername: string | null;
    affiliateCode: string | null;
  }>;
  defaultValue?: string;
}) {
  return <OwnerAffiliateCombobox owners={owners} defaultValue={defaultValue} />;
}

function InfoBox({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Link2;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="size-4 text-accent" />
        {title}
      </div>
      <p className="mt-3 break-all text-sm leading-6 text-[var(--muted)]">
        {value}
      </p>
    </div>
  );
}

function CommandBlock({ title, command }: { title: string; command: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <ExternalLink className="size-4 text-accent" />
          {title}
        </div>
        <Copy className="size-4 text-[var(--muted-foreground)]" />
      </div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-2xl border border-white/8 bg-black/40 p-4 text-xs leading-6 text-[var(--muted)]">
        {command}
      </pre>
    </div>
  );
}
