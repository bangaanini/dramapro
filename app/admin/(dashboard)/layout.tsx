
import { AdminSidebar } from "@/components/admin-sidebar";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { isPrismaDatabaseConnectionError } from "@/lib/prisma-errors";
import { AdminTelegramLoginRedirect } from "./AdminTelegramLoginRedirect";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: LayoutProps<"/admin">) {
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>> = null;

  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isPrismaDatabaseConnectionError(error)) {
      throw error;
    }

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-none items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="glass-panel w-full max-w-xl rounded-[2rem] border border-red-400/20 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-red-200/80">
            Database offline
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            Dashboard admin belum bisa dimuat
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Server aplikasi berhasil hidup, tetapi koneksi ke database Supabase
            sedang gagal. Coba lagi setelah koneksi database pulih.
          </p>
        </section>
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-none items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <AdminTelegramLoginRedirect />
        <section className="glass-panel w-full max-w-xl rounded-[2rem] border border-white/10 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Admin
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            Sesi admin belum aktif
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Masuk lagi untuk membuka dashboard admin. Ini biasanya terjadi
            setelah cookie admin kedaluwarsa atau berpindah browser/perangkat.
          </p>
          <a
            href="/admin/login"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Masuk admin
          </a>
        </section>
      </main>
    );
  }

  let pendingAffiliateWithdrawals = 0;

  try {
    pendingAffiliateWithdrawals = await prisma.affiliateWithdrawal.count({
      where: {
        status: "pending",
      },
    });
  } catch (error) {
    if (!isPrismaDatabaseConnectionError(error)) {
      throw error;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-none flex-col px-4 py-6 sm:px-6 lg:px-8 2xl:px-10">
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="sticky top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 min-w-0 self-start lg:top-6">
          <AdminSidebar
            adminName={admin.name}
            adminEmail={admin.email}
            pendingAffiliateWithdrawals={pendingAffiliateWithdrawals}
          />
        </div>

        <section className="min-w-0 space-y-6">{children}</section>
      </div>
    </main>
  );
}
