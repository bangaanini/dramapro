"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BellRing, LoaderCircle, Send, Smartphone } from "lucide-react";

import {
  getCurrentPushSubscription,
  subscribeToPushNotifications,
} from "@/lib/push-notification-client";
import type {
  PushNotificationAudience,
  PushNotificationType,
} from "@/lib/push-notifications";
import { cn } from "@/lib/utils";

type DramaOption = {
  coverUrl: string;
  description: string;
  episodeCount: number;
  id: string;
  providerName: string;
  title: string;
};

type PartnerBotOption = {
  botUsername: string;
  id: string;
  ownerName: string;
};

type VipPlanOption = {
  durationDays: number;
  id: string;
  name: string;
  priceAmount: number;
};

type PushNotificationComposerProps = {
  dramas: DramaOption[];
  isPushConfigured: boolean;
  partnerBots: PartnerBotOption[];
  vipPlans: VipPlanOption[];
};

const audienceOptions: Array<{
  label: string;
  value: PushNotificationAudience;
}> = [
  { label: "Semua subscriber", value: "all" },
  { label: "Guest only", value: "guest" },
  { label: "User login", value: "users" },
  { label: "VIP aktif", value: "vip" },
  { label: "Non-VIP", value: "non_vip" },
  { label: "User partner bot", value: "partner_bot" },
  { label: "User tertentu", value: "specific_users" },
];

const typeOptions: Array<{
  label: string;
  value: PushNotificationType;
}> = [
  { label: "Custom", value: "custom" },
  { label: "Drama baru", value: "drama" },
  { label: "Episode baru", value: "episode" },
  { label: "Promo VIP", value: "vip" },
];

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function parseSpecificTargets(value: string) {
  const tokens = value
    .split(/[\n,;]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
  const emails: string[] = [];
  const telegramUsernames: string[] = [];
  const userIds: string[] = [];

  for (const token of tokens) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(token)) {
      userIds.push(token);
    } else if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(token)) {
      emails.push(token.toLowerCase());
    } else {
      telegramUsernames.push(token.replace(/^@/u, "").toLowerCase());
    }
  }

  return {
    emails,
    telegramUsernames,
    userIds,
  };
}

export function PushNotificationComposer({
  dramas,
  isPushConfigured,
  partnerBots,
  vipPlans,
}: PushNotificationComposerProps) {
  const [type, setType] = useState<PushNotificationType>("custom");
  const [audience, setAudience] = useState<PushNotificationAudience>("all");
  const [selectedDramaId, setSelectedDramaId] = useState(dramas[0]?.id ?? "");
  const [episodeIndex, setEpisodeIndex] = useState(1);
  const [selectedVipPlanId, setSelectedVipPlanId] = useState(vipPlans[0]?.id ?? "");
  const [selectedPartnerBotIds, setSelectedPartnerBotIds] = useState<string[]>([]);
  const [specificTargets, setSpecificTargets] = useState("");
  const [title, setTitle] = useState("Update baru dari Layar Drama");
  const [body, setBody] = useState("Ada kabar baru untuk kamu. Buka Layar Drama sekarang.");
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("/");
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const selectedDrama = useMemo(
    () => dramas.find((drama) => drama.id === selectedDramaId) ?? dramas[0] ?? null,
    [dramas, selectedDramaId],
  );
  const selectedVipPlan = useMemo(
    () => vipPlans.find((plan) => plan.id === selectedVipPlanId) ?? vipPlans[0] ?? null,
    [selectedVipPlanId, vipPlans],
  );

  function applyTemplate(nextType: PushNotificationType) {
    setType(nextType);

    if (nextType === "drama" && selectedDrama) {
      setTitle(`Drama baru: ${selectedDrama.title}`);
      setBody(`Tonton ${selectedDrama.title} sekarang di Layar Drama.`);
      setImageUrl(selectedDrama.coverUrl);
      setTargetUrl(`/watch/${selectedDrama.id}`);
    } else if (nextType === "episode" && selectedDrama) {
      setTitle(`Episode ${episodeIndex} sudah tersedia`);
      setBody(`${selectedDrama.title} episode ${episodeIndex} sudah bisa ditonton.`);
      setImageUrl(selectedDrama.coverUrl);
      setTargetUrl(`/watch/${selectedDrama.id}/play?episode=${episodeIndex}`);
    } else if (nextType === "vip") {
      setTitle("Promo VIP Layar Drama");
      setBody(
        selectedVipPlan
          ? `Buka semua episode dengan ${selectedVipPlan.name} hanya ${formatIdr(
              selectedVipPlan.priceAmount,
            )}.`
          : "Buka semua episode premium dengan paket VIP Layar Drama.",
      );
      setImageUrl("");
      setTargetUrl("/vip");
    }
  }

  useEffect(() => {
    if (type === "drama" || type === "episode") {
      applyTemplate(type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDramaId, episodeIndex]);

  useEffect(() => {
    if (type === "vip") {
      applyTemplate("vip");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVipPlanId]);

  const targetPayload = useMemo(() => {
    return {
      ...(audience === "partner_bot" ? { partnerBotIds: selectedPartnerBotIds } : {}),
      ...(audience === "specific_users" ? parseSpecificTargets(specificTargets) : {}),
      ...(selectedDrama ? { seriesId: selectedDrama.id } : {}),
      ...(type === "episode" ? { episodeIndex } : {}),
      ...(selectedVipPlan ? { vipPricePlanId: selectedVipPlan.id } : {}),
    };
  }, [
    audience,
    episodeIndex,
    selectedDrama,
    selectedPartnerBotIds,
    selectedVipPlan,
    specificTargets,
    type,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/admin/notifications/estimate", {
          body: JSON.stringify({
            audience,
            targetPayload,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Gagal menghitung target.");
        }

        const payload = (await response.json()) as { count: number };
        setTargetCount(payload.count);
      } catch {
        setTargetCount(null);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [audience, targetPayload]);

  async function submitCampaign(
    endpoint: "/api/admin/notifications" | "/api/admin/notifications/test",
  ) {
    const payload = {
      audience,
      body,
      imageUrl,
      targetPayload,
      targetUrl,
      title,
      type,
    };

    const response = await fetch(endpoint, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(errorPayload?.error || "Notifikasi gagal dikirim.");
    }

    return response.json();
  }

  async function handleSend() {
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const campaign = (await submitCampaign("/api/admin/notifications")) as {
        status: string;
        totalTargets: number;
      };
      setStatusMessage(
        campaign.totalTargets > 0
          ? `Notifikasi masuk queue untuk ${campaign.totalTargets} device.`
          : "Tidak ada target subscriber untuk notifikasi ini.",
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Notifikasi gagal dikirim.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTest() {
    setIsTesting(true);
    setStatusMessage(null);

    try {
      await subscribeToPushNotifications();
      const subscription = await getCurrentPushSubscription();

      if (!subscription) {
        throw new Error("Subscription browser ini belum siap.");
      }

      const response = await fetch("/api/admin/notifications/test", {
        body: JSON.stringify({
          body,
          imageUrl,
          subscription: subscription.toJSON(),
          targetUrl,
          title,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Test notifikasi gagal dibuat.");
      }

      setStatusMessage("Test notifikasi masuk queue untuk device ini.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Test notifikasi gagal.");
    } finally {
      setIsTesting(false);
    }
  }

  function togglePartnerBot(id: string) {
    setSelectedPartnerBotIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="glass-panel rounded-[2rem] border border-white/10 p-5">
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => applyTemplate(option.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                type === option.value
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {!isPushConfigured ? (
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            VAPID key belum diatur. Jalankan `npm run push:vapid`, lalu isi env
            `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` dan `WEB_PUSH_VAPID_PRIVATE_KEY`.
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Judul">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none focus:border-accent/50"
            />
          </Field>
          <Field label="Link tujuan">
            <input
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none focus:border-accent/50"
              placeholder="/watch/..."
            />
          </Field>
          <Field label="Isi pesan">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-accent/50"
            />
          </Field>
          <div className="space-y-4">
            <Field label="Gambar / cover opsional">
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none focus:border-accent/50"
                placeholder="/cover.jpg atau https://..."
              />
            </Field>
            <Field label="Target penerima">
              <select
                value={audience}
                onChange={(event) =>
                  setAudience(event.target.value as PushNotificationAudience)
                }
                className="h-12 w-full rounded-2xl border border-white/10 bg-[rgb(31,21,20)] px-4 text-sm text-white outline-none"
              >
                {audienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(type === "drama" || type === "episode") && dramas.length > 0 ? (
            <Field label="Drama">
              <select
                value={selectedDramaId}
                onChange={(event) => setSelectedDramaId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-[rgb(31,21,20)] px-4 text-sm text-white outline-none"
              >
                {dramas.map((drama) => (
                  <option key={drama.id} value={drama.id}>
                    {drama.title}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {type === "episode" ? (
            <Field label="Episode">
              <input
                min={1}
                max={selectedDrama?.episodeCount || undefined}
                type="number"
                value={episodeIndex}
                onChange={(event) => setEpisodeIndex(Number(event.target.value) || 1)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none focus:border-accent/50"
              />
            </Field>
          ) : null}
          {type === "vip" && vipPlans.length > 0 ? (
            <Field label="Paket VIP">
              <select
                value={selectedVipPlanId}
                onChange={(event) => setSelectedVipPlanId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-[rgb(31,21,20)] px-4 text-sm text-white outline-none"
              >
                {vipPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {formatIdr(plan.priceAmount)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>

        {audience === "partner_bot" ? (
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Pilih partner bot</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {partnerBots.map((bot) => (
                <label
                  key={bot.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white"
                >
                  <input
                    type="checkbox"
                    checked={selectedPartnerBotIds.includes(bot.id)}
                    onChange={() => togglePartnerBot(bot.id)}
                    className="size-4 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 truncate">
                    @{bot.botUsername} · {bot.ownerName}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {audience === "specific_users" ? (
          <Field label="User tertentu" className="mt-5">
            <textarea
              value={specificTargets}
              onChange={(event) => setSpecificTargets(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-accent/50"
              placeholder="email, @telegram_username, atau user UUID. Pisahkan dengan koma/baris baru."
            />
          </Field>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/76">
            Estimasi target:{" "}
            <span className="font-semibold text-white">
              {targetCount === null ? "menghitung..." : targetCount}
            </span>{" "}
            device
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={!isPushConfigured || isTesting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isTesting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Smartphone className="size-4" />
              )}
              Kirim test
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!isPushConfigured || isSubmitting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Kirim ke queue
            </button>
          </div>
        </div>

        {statusMessage ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/80">
            {statusMessage}
          </div>
        ) : null}
      </section>

      <aside className="glass-panel h-fit rounded-[2rem] border border-white/10 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <BellRing className="size-4" />
          Live preview
        </div>
        <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/30 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.26)]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="mb-4 aspect-video w-full rounded-[1.2rem] object-cover"
            />
          ) : null}
          <p className="text-base font-semibold text-white">{title || "Judul notifikasi"}</p>
          <p className="mt-2 text-sm leading-6 text-white/70">
            {body || "Isi pesan notifikasi akan tampil di sini."}
          </p>
          <p className="mt-4 truncate rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-white/58">
            {targetUrl || "/"}
          </p>
        </div>
      </aside>
    </div>
  );
}

function Field({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="block text-sm font-medium text-white">{label}</span>
      {children}
    </label>
  );
}
