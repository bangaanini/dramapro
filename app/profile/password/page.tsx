import Link from "next/link";
import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";

import { changePasswordUserAction } from "@/app/auth/actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function ProfilePasswordPage(
  props: PageProps<"/profile/password">,
) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/profile/password");
  }

  const searchParams = await props.searchParams;
  const passwordError =
    typeof searchParams.passwordError === "string"
      ? searchParams.passwordError
      : null;
  const passwordSuccess =
    typeof searchParams.passwordSuccess === "string"
      ? searchParams.passwordSuccess
      : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <section className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <div className="space-y-3">
          <Badge className="border-accent/30 bg-accent-soft text-accent">
            <KeyRound className="mr-2 size-3.5" />
            Ganti password
          </Badge>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                Password akun
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Perbarui password akunmu dengan aman kapan saja.
              </p>
            </div>
            <Link
              href="/profile"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--muted)] transition hover:border-white/20 hover:bg-white/8 hover:text-white"
            >
              Kembali ke profil
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <Card className="glass-panel rounded-[1.9rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <form action={changePasswordUserAction} className="grid gap-4">
              <input type="hidden" name="redirectTo" value="/profile/password" />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">
                  Password saat ini
                </span>
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Password baru</span>
                <input
                  name="nextPassword"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">
                  Konfirmasi password baru
                </span>
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              {passwordError ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {passwordError}
                </div>
              ) : null}

              {passwordSuccess ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {passwordSuccess}
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit">Simpan password baru</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
