"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import "@/lib/telegram-web-app";

type LoginStatus = "loading" | "success" | "error";

export function TelegramAdminLoginClient() {
  const [status, setStatus] = useState<LoginStatus>("loading");
  const [message, setMessage] = useState("Memverifikasi admin Telegram...");

  useEffect(() => {
    let cancelled = false;

    async function createSession() {
      const webApp = window.Telegram?.WebApp;
      const initData = webApp?.initData?.trim() ?? "";

      webApp?.ready?.();
      webApp?.expand?.();

      if (!initData) {
        setStatus("error");
        setMessage(
          "Halaman ini harus dibuka dari tombol Admin di bot Telegram utama.",
        );
        return;
      }

      try {
        const response = await fetch("/api/admin/telegram-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ initData }),
        });
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Login admin Telegram gagal.");
        }

        if (cancelled) {
          return;
        }

        setStatus("success");
        setMessage("Sesi admin aktif. Membuka dashboard...");
        window.location.replace("/admin/dashboard");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Login admin Telegram gagal.",
        );
      }
    }

    void createSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-none items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel w-full max-w-xl rounded-[2rem] border border-white/10 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Admin Telegram
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          {status === "success" ? "Sesi admin aktif" : "Membuka dashboard admin"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{message}</p>

        {status === "loading" ? (
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]" />
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Kembali
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Login manual
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
