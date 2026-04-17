"use client";

import * as React from "react";
import Image from "next/image";

import { FormSubmitButton } from "@/components/form-submit-button";
import { cn } from "@/lib/utils";

type BroadcastDramaOption = {
  defaultCaption: string;
  description: string | null;
  episodeCount: number;
  id: string;
  providerName: string;
  thumbUrl: string | null;
  title: string;
};

type HiddenField = {
  name: string;
  value: string;
};

type DramaChannelBroadcastComposerProps = {
  action: (formData: FormData) => void | Promise<void>;
  botName: string;
  botUsername: string;
  channelFieldLabel?: string;
  channelFieldPlaceholder?: string;
  extraFields?: React.ReactNode;
  helperText: string;
  hiddenFields?: HiddenField[];
  initialButtonLabel: string;
  initialCaption: string;
  initialChannelUsername?: string;
  initialDramaId: string;
  pendingLabel: string;
  dramas: BroadcastDramaOption[];
  submitLabel: string;
};

function formatCaptionLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => {
      if (line.length > 0) {
        return true;
      }

      return index > 0 && lines[index - 1]?.length > 0;
    });
}

export function DramaChannelBroadcastComposer({
  action,
  botName,
  botUsername,
  channelFieldLabel = "Channel Telegram",
  channelFieldPlaceholder = "@channelkamu atau https://t.me/channelkamu",
  dramas,
  extraFields,
  helperText,
  hiddenFields = [],
  initialButtonLabel,
  initialCaption,
  initialChannelUsername = "",
  initialDramaId,
  pendingLabel,
  submitLabel,
}: DramaChannelBroadcastComposerProps) {
  const dramaMap = React.useMemo(
    () => new Map(dramas.map((drama) => [drama.id, drama])),
    [dramas],
  );
  const [selectedDramaId, setSelectedDramaId] = React.useState(initialDramaId);
  const [channelUsername, setChannelUsername] = React.useState(
    initialChannelUsername,
  );
  const [buttonLabel, setButtonLabel] = React.useState(initialButtonLabel);
  const [caption, setCaption] = React.useState(initialCaption);
  const [pinMessage, setPinMessage] = React.useState(true);
  const selectedDrama = dramaMap.get(selectedDramaId) ?? dramas[0] ?? null;
  const previousDramaIdRef = React.useRef(initialDramaId);

  React.useEffect(() => {
    if (!selectedDrama) {
      return;
    }

    const previousDrama = dramaMap.get(previousDramaIdRef.current);
    const previousDefaultCaption = previousDrama?.defaultCaption ?? "";
    const shouldRefreshCaption =
      !caption.trim() || caption.trim() === previousDefaultCaption.trim();

    if (shouldRefreshCaption) {
      setCaption(selectedDrama.defaultCaption);
    }

    previousDramaIdRef.current = selectedDrama.id;
  }, [caption, dramaMap, selectedDrama]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
      <form
        action={action}
        className="glass-panel space-y-5 rounded-[2rem] border border-white/10 p-5"
      >
        {hiddenFields.map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value} />
        ))}

        {extraFields ? <div>{extraFields}</div> : null}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label className="block text-sm font-medium text-white">
              {channelFieldLabel}
            </label>
            <input
              name="channelUsername"
              value={channelUsername}
              onChange={(event) => setChannelUsername(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-[var(--muted-foreground)] focus:border-accent/50"
              placeholder={channelFieldPlaceholder}
            />
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{helperText}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white">
              Drama yang dibroadcast
            </label>
            <select
              name="dramaId"
              value={selectedDramaId}
              onChange={(event) => setSelectedDramaId(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[rgb(31,21,20)] px-4 text-sm text-white outline-none"
            >
              {dramas.map((drama) => (
                <option key={drama.id} value={drama.id} className="bg-[rgb(31,21,20)]">
                  {drama.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label className="block text-sm font-medium text-white">
              Caption post
            </label>
            <textarea
              name="caption"
              rows={11}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-[var(--muted-foreground)] focus:border-accent/50"
            />
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Telegram membatasi caption foto sampai 1024 karakter.
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Baris VIP, Panduan Pengguna, dan Hubungi Admin akan otomatis jadi
              inline link ke bot pengirim selama labelnya tetap dipakai.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">
                Label tombol tonton
              </label>
              <input
                name="buttonLabel"
                value={buttonLabel}
                onChange={(event) => setButtonLabel(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-[var(--muted-foreground)] focus:border-accent/50"
                placeholder="▶️ Tonton Sekarang"
              />
            </div>

            <label className="flex items-center gap-3 rounded-[1.6rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
              <input
                type="checkbox"
                name="pinMessage"
                checked={pinMessage}
                onChange={(event) => setPinMessage(event.target.checked)}
                className="size-4 rounded border-white/20 bg-transparent accent-[var(--accent)]"
              />
              Pin post setelah terkirim
            </label>

            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4 text-xs leading-6 text-[var(--muted)]">
              <p className="font-semibold text-white">Bot pengirim</p>
              <p className="mt-2">@{botUsername}</p>
              <p className="mt-1">{botName}</p>
            </div>
          </div>
        </div>

        <FormSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          className="h-12 w-full"
        />
      </form>

      <section className="glass-panel rounded-[2rem] border border-white/10 p-4">
        <p className="text-sm font-semibold text-accent">Preview channel post</p>

        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Channel
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {channelUsername.trim() || "@channelkamu"}
          </p>
          <p className="mt-2 text-sm text-accent">@{botUsername}</p>
        </div>

        <div className="mt-4 rounded-[1.8rem] border border-white/10 bg-[rgba(31,42,54,0.9)] p-3">
          <div className="overflow-hidden rounded-[1.3rem] border border-white/10 bg-[#2c3947]">
            <div className="relative aspect-[4/5] bg-black/40">
              {selectedDrama?.thumbUrl ? (
                <Image
                  src={selectedDrama.thumbUrl}
                  alt={selectedDrama.title}
                  className="h-full w-full object-cover"
                  fill
                  sizes="360px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
                  Poster drama akan muncul di sini.
                </div>
              )}
            </div>

            <div className="p-4 text-sm leading-7 text-white">
              {formatCaptionLines(caption || selectedDrama?.defaultCaption || "").map(
                (line, index) => (
                  <p key={`${line}-${index}`} className={cn(!line.trim() && "min-h-3")}>
                    {line || "\u00A0"}
                  </p>
                ),
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="grid gap-2">
              <div className="rounded-[1rem] border border-white/10 bg-[#253140] px-4 py-3 text-center text-sm font-semibold text-white">
                {buttonLabel.trim() || "▶️ Tonton Sekarang"}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
