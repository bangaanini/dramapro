import { KeyRound, ShieldCheck } from "lucide-react";

import { changeAdminPasswordAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPasswordPage(
  props: PageProps<"/admin/password">,
) {
  const [admin, searchParams] = await Promise.all([
    getCurrentAdmin(),
    props.searchParams,
  ]);
  const saved = searchParams.saved === "1";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <KeyRound className="mr-2 size-3.5" />
          Password Admin
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Ubah password dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Password dari <span className="font-medium text-white">ADMIN_PASSWORD</span>{" "}
          hanya dipakai saat bootstrap admin pertama kali. Setelah admin tersimpan
          di database, password yang aktif adalah hash di tabel admin.
        </p>
      </section>

      {saved ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Password admin berhasil diperbarui.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Password baru
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Gunakan password minimal 8 karakter. Setelah disimpan, login
                berikutnya akan memakai password baru ini.
              </p>
            </div>

            <form action={changeAdminPasswordAction} className="space-y-4">
              <Field
                label="Password saat ini"
                name="currentPassword"
                autoComplete="current-password"
              />
              <Field
                label="Password baru"
                name="nextPassword"
                autoComplete="new-password"
              />
              <Field
                label="Konfirmasi password baru"
                name="confirmPassword"
                autoComplete="new-password"
              />

              <Button type="submit" className="w-full sm:w-auto">
                <KeyRound className="mr-2 size-4" />
                Simpan password baru
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-4 p-6">
            <Badge className="border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
              <ShieldCheck className="mr-2 size-3.5" />
              Admin aktif
            </Badge>
            <div>
              <p className="text-lg font-semibold text-white">
                {admin?.name ?? "Admin"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {admin?.email ?? "admin"}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              Tips: untuk source code yang dijual ke user awam, biarkan{" "}
              <span className="font-medium text-white">ADMIN_PASSWORD</span>{" "}
              sebagai password awal. Setelah login pertama, admin bisa mengganti
              password dari halaman ini.
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
  autoComplete,
}: {
  label: string;
  name: string;
  autoComplete: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <input
        name={name}
        type="password"
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
      />
    </label>
  );
}
