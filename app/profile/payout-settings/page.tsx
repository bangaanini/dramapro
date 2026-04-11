import Link from "next/link";
import { Landmark, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";

import { saveAffiliatePayoutProfileAction } from "@/app/affiliate/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function ProfilePayoutSettingsPage(
  props: PageProps<"/profile/payout-settings">,
) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/profile/payout-settings");
  }

  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const success =
    typeof searchParams.success === "string" ? searchParams.success : null;
  const next = resolveSafeRedirectPath(
    typeof searchParams.next === "string"
      ? searchParams.next
      : "/profile/payout-settings",
  );

  const payoutProfile = await prisma.affiliatePayoutProfile.findUnique({
    where: {
      userId: user.id,
    },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <section className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <div className="space-y-3">
          <Badge className="border-accent/30 bg-accent-soft text-accent">
            <WalletCards className="mr-2 size-3.5" />
            Detail withdraw affiliate
          </Badge>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                Rekening pencairan
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Simpan data payout default agar saat menarik komisi affiliate,
                kamu tidak perlu mengisi form transfer berulang kali.
              </p>
            </div>
            <Link
              href={next === "/profile/payout-settings" ? "/profile" : next}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--muted)] transition hover:border-white/20 hover:bg-white/8 hover:text-white"
            >
              Kembali
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="glass-panel rounded-[1.9rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <form action={saveAffiliatePayoutProfileAction} className="grid gap-4">
              <input type="hidden" name="redirectTo" value={next} />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">
                  Nama pemilik rekening
                </span>
                <input
                  name="accountHolderName"
                  type="text"
                  defaultValue={payoutProfile?.accountHolderName ?? user.name}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Nama bank / e-wallet</span>
                <input
                  name="bankName"
                  type="text"
                  defaultValue={payoutProfile?.bankName ?? ""}
                  placeholder="Contoh: BCA, BRI, Mandiri, DANA"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Nomor rekening</span>
                <input
                  name="accountNumber"
                  type="text"
                  inputMode="numeric"
                  defaultValue={payoutProfile?.accountNumber ?? ""}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white">Nomor WhatsApp</span>
                  <input
                    name="whatsappNumber"
                    type="text"
                    defaultValue={payoutProfile?.whatsappNumber ?? ""}
                    placeholder="08xxxxxxxxxx"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white">Email payout</span>
                  <input
                    name="payoutEmail"
                    type="email"
                    defaultValue={payoutProfile?.payoutEmail ?? user.email}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Catatan opsional</span>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={payoutProfile?.notes ?? ""}
                  placeholder="Contoh: prioritas transfer ke rekening utama"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {success}
                </div>
              ) : null}

              <div className="flex justify-end">
                <FormSubmitButton
                  type="submit"
                  idleLabel="Simpan detail payout"
                  pendingLabel="Menyimpan..."
                />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[1.9rem] border-white/10">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
                <Landmark className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Cara kerja payout</h2>
                <p className="text-sm text-[var(--muted)]">
                  Snapshot detail payout akan disalin ke setiap request withdrawal.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
              <p>1. Lengkapi data rekening sekali saja di halaman ini.</p>
              <p>2. Saat kamu klik tarik komisi, sistem otomatis memakai data payout default.</p>
              <p>3. Admin akan melihat detail transfer yang tersimpan pada request tersebut.</p>
              <p>4. Jika nanti data rekening berubah, cukup update di sini untuk request berikutnya.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
