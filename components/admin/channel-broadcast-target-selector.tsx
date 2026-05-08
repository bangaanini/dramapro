"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type PartnerBotTarget = {
  botUsername: string;
  defaultChannelUsername: string | null;
  id: string;
  isEnabled: boolean;
};

type ChannelBroadcastTargetSelectorProps = {
  mainBotUsername: string;
  partnerBots: PartnerBotTarget[];
};

export function ChannelBroadcastTargetSelector({
  mainBotUsername,
  partnerBots,
}: ChannelBroadcastTargetSelectorProps) {
  const [includeMainBot, setIncludeMainBot] = React.useState(true);
  const [selectedPartnerBotIds, setSelectedPartnerBotIds] = React.useState<string[]>(
    [],
  );

  const readyPartnerBotIds = React.useMemo(
    () =>
      partnerBots
        .filter((bot) => bot.isEnabled && bot.defaultChannelUsername?.trim())
        .map((bot) => bot.id),
    [partnerBots],
  );
  const selectedReadyPartnerCount = selectedPartnerBotIds.filter((id) =>
    readyPartnerBotIds.includes(id),
  ).length;
  const selectedTargetCount =
    (includeMainBot ? 1 : 0) + selectedReadyPartnerCount;

  const togglePartnerBot = (botId: string, checked: boolean) => {
    setSelectedPartnerBotIds((current) => {
      if (checked) {
        return current.includes(botId) ? current : [...current, botId];
      }

      return current.filter((id) => id !== botId);
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Target broadcast</p>
            <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
              Bot utama bisa kirim ke channel yang kamu isi di form. Partner bot
              akan otomatis kirim ke channel default masing-masing.
            </p>
            <p className="mt-2 text-xs text-accent">
              {selectedTargetCount} target dipilih. {readyPartnerBotIds.length} partner
              memenuhi kriteria.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              disabled={readyPartnerBotIds.length === 0}
              onClick={() => {
                setIncludeMainBot(true);
                setSelectedPartnerBotIds(readyPartnerBotIds);
              }}
              className="rounded-full border border-accent/30 bg-accent-soft px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-[var(--muted)]"
            >
              Pilih semua siap
            </button>
            <button
              type="button"
              onClick={() => setSelectedPartnerBotIds([])}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Kosongkan partner
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white">
            <input
              type="checkbox"
              name="includeMainBot"
              checked={includeMainBot}
              onChange={(event) => setIncludeMainBot(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--accent)]"
            />
            <span className="space-y-1">
              <span className="block font-medium">Bot utama</span>
              <span className="block text-xs leading-5 text-[var(--muted)]">
                @{mainBotUsername || "belum-diatur"}
              </span>
            </span>
          </label>

          {partnerBots.map((bot) => {
            const disabled = !bot.isEnabled || !bot.defaultChannelUsername?.trim();
            const checked = selectedPartnerBotIds.includes(bot.id);

            return (
              <label
                key={bot.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
                  disabled
                    ? "border-white/5 bg-white/[0.03] text-[var(--muted)]"
                    : "border-white/10 bg-black/20 text-white",
                )}
              >
                <input
                  type="checkbox"
                  name="partnerBotIds"
                  value={bot.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => togglePartnerBot(bot.id, event.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--accent)]"
                />
                <span className="space-y-1">
                  <span className="block font-medium">@{bot.botUsername}</span>
                  <span className="block text-xs leading-5 text-[var(--muted)]">
                    {bot.defaultChannelUsername?.trim()
                      ? `Channel: ${bot.defaultChannelUsername}`
                      : "Belum punya channel default"}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
