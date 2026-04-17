import { MessageCircleMore, Sparkles } from "lucide-react";

import { TelegramMessageEditor } from "@/components/admin/telegram-message-editor";
import { Badge } from "@/components/ui/badge";
import { getAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export default async function AdminBotMessagePage(
  props: PageProps<"/admin/bot-message">,
) {
  const searchParams = await props.searchParams;
  const state = typeof searchParams.botUi === "string" ? searchParams.botUi : "";
  const message =
    typeof searchParams.message === "string" ? searchParams.message : "";
  const settings = await getAppSettings();

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <Sparkles className="mr-2 size-3.5" />
          Pesan bot
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Sambutan dan keyboard bot utama
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Halaman ini khusus untuk mengatur isi pesan{" "}
          <span className="font-medium text-white">/start</span> dan 10 tombol
          inline opsional. Pengaturan runtime bot, webhook, dan Mini App tetap
          ada di halaman Bot Settings supaya fokusnya tidak bercampur.
        </p>
      </section>

      {state ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            state === "error"
              ? "border-red-400/20 bg-red-500/10 text-red-100"
              : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {message ||
            (state === "error"
              ? "Pengaturan pesan bot gagal disimpan."
              : "Pengaturan pesan bot berhasil disimpan.")}
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(26,18,16,0.96),rgba(13,9,8,0.98))] p-5 text-sm leading-7 text-[var(--muted)]">
        <div className="flex items-center gap-2 text-white">
          <MessageCircleMore className="size-4 text-accent" />
          Placeholder yang didukung
        </div>
        <p className="mt-2">
          Gunakan <span className="font-medium text-white">{"{name}"}</span>{" "}
          untuk nama Telegram user dan{" "}
          <span className="font-medium text-white">{"{siteName}"}</span> untuk
          brand aplikasi. Untuk tombol Mini App internal, cukup isi URL halaman
          web kamu seperti <span className="font-medium text-white">/search</span>{" "}
          versi lengkap, nanti bot akan membukanya sebagai Mini App.
        </p>
      </div>

      <TelegramMessageEditor
        initialButtons={settings.telegram.inlineButtons}
        initialWelcomeMessage={settings.telegram.menu.welcomeMessage}
        previewBotName={settings.site.name}
        previewDescription={settings.site.description}
        previewHost={settings.site.url.replace(/^https?:\/\//, "")}
        previewTitle={settings.site.title}
      />
    </div>
  );
}
