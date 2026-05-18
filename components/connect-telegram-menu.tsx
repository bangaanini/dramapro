"use client";

import { useState, useTransition } from "react";
import { ChevronRight, LoaderCircle, Send, X } from "lucide-react";

import { connectTelegramAction } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ConnectTelegramMenuProps = {
  variant?: "card" | "header-link";
};

export function ConnectTelegramMenu({
  variant = "card",
}: ConnectTelegramMenuProps = {}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);

    const formData = new FormData(formEvent.currentTarget);

    startTransition(async () => {
      const result = await connectTelegramAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setModalOpen(false);
        setSuccess(false);
        setTelegramUsername("");
        window.location.reload();
      }, 800);
    });
  }

  const trigger =
    variant === "header-link" ? (
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white"
      >
        <Send className="size-4.5" />
        <span>Hubungkan Telegram</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="block w-full text-left"
      >
        <Card className="soft-panel rounded-[1.6rem] border-white/10 transition hover:border-accent/35">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                <Send className="size-5" />
              </div>
              <div>
                <p className="font-medium text-white">Hubungkan Telegram</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Tambah Telegram username supaya akun mini-app & web bisa
                  digabungkan saat kamu buka mini-app.
                </p>
              </div>
            </div>
            <ChevronRight className="size-5 text-white/45" />
          </CardContent>
        </Card>
      </button>
    );

  return (
    <>
      {trigger}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isPending) {
              setModalOpen(false);
              setError(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-[#0d0918] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Hubungkan Telegram
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/64">
                  Masukkan Telegram username kamu (tanpa @). Saat kamu buka
                  Layar Drama lewat mini-app dengan akun Telegram tersebut,
                  akun web ini akan ditawarkan untuk digabungkan.
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => {
                  if (!isPending) {
                    setModalOpen(false);
                    setError(null);
                  }
                }}
                className="inline-flex size-8 items-center justify-center rounded-full text-white/52 transition hover:bg-white/8 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">
                  Telegram username
                </span>
                <input
                  name="telegramUsername"
                  type="text"
                  autoComplete="off"
                  required
                  placeholder="contoh: johndoe"
                  value={telegramUsername}
                  onChange={(event) =>
                    setTelegramUsername(event.currentTarget.value)
                  }
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
                  Telegram username berhasil disimpan.
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (!isPending) {
                      setModalOpen(false);
                      setError(null);
                    }
                  }}
                  disabled={isPending}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={isPending || success}>
                  {isPending ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
