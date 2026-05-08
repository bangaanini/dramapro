import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  Megaphone,
  RadioTower,
  Search,
} from "lucide-react";

import { publishAdminDramaChannelBroadcastAction } from "@/app/admin/actions";
import { ChannelBroadcastTargetSelector } from "@/components/admin/channel-broadcast-target-selector";
import { DramaChannelBroadcastComposer } from "@/components/admin/drama-channel-broadcast-composer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAppSettings } from "@/lib/app-settings";
import {
  buildDefaultDramaChannelBroadcastCaption,
  getDefaultDramaChannelBroadcastButtonLabel,
  listRecentDramaChannelBroadcasts,
  searchDramasForChannelBroadcast,
} from "@/lib/drama-channel-broadcasts";
import { getTelegramPartnerBotAdminRows } from "@/lib/telegram-partner-bots";

export const dynamic = "force-dynamic";

type AdminChannelBroadcastsPageProps = {
  searchParams: Promise<{
    broadcast?: string;
    message?: string;
    q?: string;
    drama?: string;
  }>;
};

export default async function AdminChannelBroadcastsPage({
  searchParams,
}: AdminChannelBroadcastsPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const selectedDramaId = typeof params.drama === "string" ? params.drama.trim() : "";
  const [settings, partnerBots, dramas, recentBroadcasts] = await Promise.all([
    getAppSettings(),
    getTelegramPartnerBotAdminRows(),
    searchDramasForChannelBroadcast(query),
    listRecentDramaChannelBroadcasts({ limit: 8 }),
  ]);

  const fallbackDramas = dramas.length > 0 ? dramas : await searchDramasForChannelBroadcast("");
  const selectedDrama =
    fallbackDramas.find((drama) => drama.id === selectedDramaId) ?? fallbackDramas[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <Megaphone className="mr-2 size-3.5" />
          Broadcast drama
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Kirim poster detail drama ke channel
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--muted)]">
          Admin bisa broadcast halaman detail drama ke channel bot utama dan
          partner bot sekaligus. Tombol utama akan membuka detail drama, bukan
          episode langsung, supaya user tetap melihat poster, ringkasan, dan CTA
          tonton yang utuh di Mini App. Semua link di caption akan mengarah ke
          bot yang mengirim broadcast tersebut.
        </p>
      </section>

      {params.broadcast ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            params.broadcast === "error"
              ? "border-red-400/20 bg-red-500/10 text-red-100"
              : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {params.message ??
            (params.broadcast === "error"
              ? "Broadcast gagal dikirim."
              : "Broadcast berhasil dikirim.")}
        </div>
      ) : null}

      <Card className="glass-panel rounded-[2rem] border-white/10">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                <Search className="mr-2 size-3.5" />
                Cari katalog lokal
              </Badge>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Pilih drama dari database lokal yang sudah playable. Kalau kolom
                cari kosong, daftar di bawah otomatis mengambil 20 drama dari
                feed homepage terbaru.
              </p>
            </div>

            <form className="flex w-full gap-3 lg:max-w-xl" action="/admin/channel-broadcasts">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Cari judul drama untuk channel partner"
                className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-[var(--muted-foreground)] focus:border-accent/50"
              />
              <Button type="submit" className="h-12 px-5">
                Cari judul
              </Button>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Drama siap broadcast" value={String(fallbackDramas.length)} />
            <StatTile
              label="Partner aktif"
              value={String(partnerBots.filter((bot) => bot.isEnabled).length)}
            />
            <StatTile
              label="Punya channel default"
              value={String(
                partnerBots.filter(
                  (bot) => bot.isEnabled && bot.defaultChannelUsername?.trim(),
                ).length,
              )}
            />
          </div>
        </CardContent>
      </Card>

      {selectedDrama ? (
        <DramaChannelBroadcastComposer
          action={publishAdminDramaChannelBroadcastAction}
          botName={settings.site.name}
          botUsername={settings.telegram.botUsername ?? "bot_kamu"}
          helperText="Isi channel bot utama jika target utama ikut broadcast. Partner bot akan memakai channel default masing-masing."
          initialButtonLabel={getDefaultDramaChannelBroadcastButtonLabel()}
          initialCaption={buildDefaultDramaChannelBroadcastCaption({
            botUsername: settings.telegram.botUsername ?? "bot_kamu",
            description: selectedDrama.description,
            title: selectedDrama.title,
          })}
          initialChannelUsername={settings.telegram.defaultBroadcastChannel}
          initialDramaId={selectedDrama.id}
          pendingLabel="Mengirim broadcast..."
          submitLabel="Kirim broadcast drama"
          dramas={fallbackDramas.map((drama) => ({
            defaultCaption: buildDefaultDramaChannelBroadcastCaption({
              botUsername: settings.telegram.botUsername ?? "bot_kamu",
              description: drama.description,
              title: drama.title,
            }),
            description: drama.description,
            episodeCount: drama.episodeCount,
            id: drama.id,
            providerName: drama.providerName,
            thumbUrl: drama.thumbUrl,
            title: drama.title,
          }))}
          extraFields={
            <ChannelBroadcastTargetSelector
              mainBotUsername={settings.telegram.botUsername || "belum-diatur"}
              partnerBots={partnerBots
                .filter((bot) => bot.isEnabled)
                .map((bot) => ({
                  botUsername: bot.botUsername,
                  defaultChannelUsername: bot.defaultChannelUsername,
                  id: bot.id,
                  isEnabled: bot.isEnabled,
                }))}
            />
          }
        />
      ) : (
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="p-8 text-center text-[var(--muted)]">
            Belum ada drama playable yang siap dibroadcast. Jalankan sync atau
            ubah kata kunci pencarian.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <RadioTower className="size-4 text-accent" />
              <h2 className="text-xl font-semibold text-white">Riwayat broadcast</h2>
            </div>

            {recentBroadcasts.length > 0 ? (
              <div className="space-y-3">
                {recentBroadcasts.map((item) => {
                  const channelPostUrl =
                    item.telegramMessageId && item.channelUsername
                      ? `https://t.me/${item.channelUsername}/${item.telegramMessageId}`
                      : null;

                  return (
                    <div
                      key={item.id}
                      className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.drama.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                            @{item.botUsername} → @{item.channelUsername}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                            {new Intl.DateTimeFormat("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(item.createdAt)}
                          </p>
                        </div>
                        {item.pinned ? (
                          <Badge className="border-emerald-400/20 bg-emerald-500/10 text-emerald-100">
                            <CheckCircle2 className="mr-1 size-3.5" />
                            Pinned
                          </Badge>
                        ) : null}
                      </div>

                      {channelPostUrl ? (
                        <div className="mt-3">
                          <Link
                            href={channelPostUrl}
                            target="_blank"
                            className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 text-sm font-medium text-white transition hover:bg-white/10"
                          >
                            Buka post channel
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm leading-7 text-[var(--muted)]">
                Belum ada riwayat broadcast drama.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-accent" />
              <h2 className="text-xl font-semibold text-white">Catatan implementasi</h2>
            </div>
            <ul className="space-y-3 text-sm leading-7 text-[var(--muted)]">
              <li>Broadcast selalu membuka halaman detail drama, bukan episode langsung.</li>
              <li>Tombol utama tetap satu saja supaya CTA paling jelas dan tidak pecah fokus.</li>
              <li>Link VIP, panduan, dan hubungi admin di caption akan otomatis jadi inline link.</li>
              <li>Partner bot memakai link bot masing-masing agar konteks referral tetap aman.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
