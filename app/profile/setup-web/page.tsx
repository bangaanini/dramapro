import Link from "next/link";
import { Mail } from "lucide-react";
import { redirect } from "next/navigation";

import { setupWebAccountAction } from "@/app/profile/actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function SetupWebAccountPage(
  props: PageProps<"/profile/setup-web">,
) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/profile/setup-web");
  }

  if (user.hasWebAccount) {
    redirect("/profile/password");
  }

  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const initialEmail =
    typeof searchParams.email === "string" ? searchParams.email : "";

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <section className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <div className="space-y-3">
          <Badge className="border-accent/30 bg-accent-soft text-accent">
            <Mail className="mr-2 size-3.5" />
            Buat akun web
          </Badge>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                Buat akun web
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Tambah email dan password supaya kamu juga bisa login lewat
                browser. Data VIP, history, dan semua benefit akun mini-app
                tetap sama.
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
            <form action={setupWebAccountAction} className="grid gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Email</span>
                <input
                  name="email"
                  type="email"
                  defaultValue={initialEmail}
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">
                  Password (min. 8 karakter)
                </span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">
                  Konfirmasi password
                </span>
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit">Simpan akun web</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
