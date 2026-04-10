import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { loginAdminAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ensureDefaultAdminExists, getCurrentAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage(
  props: PageProps<"/admin/login">,
) {
  await ensureDefaultAdminExists();

  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/admin/sync");
  }

  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-6 sm:px-6">
      <Card className="glass-panel w-full rounded-[2rem]">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="space-y-3">
            <Badge className="border-accent/30 bg-accent-soft text-accent">
              <ShieldCheck className="mr-2 size-3.5" />
              Protected admin access
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Admin Login
              </h1>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Masuk untuk menjalankan sync metadata manual dan mengelola feed
                agregasi secara aman.
              </p>
            </div>
          </div>

          <form action={loginAdminAction} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="admin@dramapro.local"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full">
              Masuk ke admin
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
