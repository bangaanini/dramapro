import { ImageIcon, SearchCheck, Sparkles } from "lucide-react";

import { saveSeoSettingsAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage(props: PageProps<"/admin/seo">) {
  const searchParams = await props.searchParams;
  const saved = typeof searchParams.saved === "string" ? searchParams.saved : "";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const settings = await getAppSettings();
  const site = settings.site;
  const brandPreviewLogo = settings.raw?.siteLogoUrl?.trim() || null;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <Sparkles className="mr-2 size-3.5" />
          SEO web
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Branding dan metadata utama
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Panel ini khusus untuk pengaturan nama situs, deskripsi, logo, dan URL
          publik. Jadi halaman Bot Settings bisa fokus hanya pada integrasi bot
          utama dan Mini App.
        </p>
      </section>

      {saved ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Pengaturan SEO berhasil disimpan.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-6 p-6">
            <div>
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                <SearchCheck className="mr-2 size-3.5" />
                Metadata utama
              </Badge>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Nama situs, URL, dan deskripsi
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Nilai di sini dipakai untuk metadata, Open Graph, sitemap,
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
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-4 p-6">
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
                  <p className="text-lg font-semibold text-white">{site.name}</p>
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
                  <p className="text-sm font-semibold text-white">{site.title}</p>
                  <p className="text-xs text-emerald-300">{site.url}</p>
                </div>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  {site.description}
                </p>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--muted-foreground)]">
                  Logo utama: {site.logoUrl}
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3 text-sm text-[var(--muted)]">
              Kalau nanti kamu ingin upgrade ke upload logo langsung dari panel,
              struktur setting ini sudah siap jadi tinggal tambah media uploader
              tanpa bongkar ulang halaman bot.
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
