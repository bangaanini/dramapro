import Link from "next/link";
import { LogIn, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { signInUserAction } from "@/app/auth/actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/library");
  }

  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const next = resolveSafeRedirectPath(
    typeof searchParams.next === "string" ? searchParams.next : "/profile",
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <div className="mx-auto flex w-full max-w-lg flex-1 items-center">
        <Card className="glass-panel w-full rounded-[2rem]">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-3">
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                <Sparkles className="mr-2 size-3.5" />
                User account access
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Sign in
                </h1>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Masuk untuk mulai menyimpan drama favorit dan menyiapkan riwayat
                  tontonan akunmu.
                </p>
              </div>
            </div>

            <form action={signInUserAction} className="space-y-4">
              <input type="hidden" name="next" value={next} />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="kamu@email.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Minimal 8 karakter"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full">
                <LogIn className="mr-2 size-4" />
                Masuk ke akun
              </Button>
            </form>

            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm text-[var(--muted)]">
              Belum punya akun?{" "}
              <Link
                href={`/sign-up?next=${encodeURIComponent(next)}`}
                className="font-medium text-white underline decoration-accent/60 underline-offset-4"
              >
                Buat akun sekarang
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <SiteFooter />
    </main>
  );
}
