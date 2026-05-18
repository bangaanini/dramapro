"use client";

import { useEffect, useState, useTransition } from "react";
import { LoaderCircle, X } from "lucide-react";

import {
  dismissMergeBannerAction,
  mergeWebAccountAction,
} from "@/app/profile/actions";
import { Button } from "@/components/ui/button";

type MergeCandidate = {
  candidateId: string;
  maskedEmail: string;
};

type MergeCandidateResponse = {
  candidate: MergeCandidate | null;
};

export function MergeCandidateBanner() {
  const [candidate, setCandidate] = useState<MergeCandidate | null>(null);
  const [hidden, setHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/me/merge-candidate", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as MergeCandidateResponse;

        if (!cancelled) {
          setCandidate(payload.candidate);
        }
      } catch {
        // silent fail
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!candidate || hidden) {
    return null;
  }

  function handleSkip() {
    if (!candidate) return;
    const formData = new FormData();
    formData.set("candidateId", candidate.candidateId);

    startTransition(async () => {
      await dismissMergeBannerAction(formData);
      setHidden(true);
    });
  }

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);

    const formData = new FormData(formEvent.currentTarget);

    startTransition(async () => {
      const result = await mergeWebAccountAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setModalOpen(false);
      setHidden(true);
      setPassword("");
      window.location.reload();
    });
  }

  return (
    <>
      <section className="rounded-[1.6rem] border border-emerald-400/25 bg-emerald-500/8 p-4">
        <p className="text-sm leading-6 text-white">
          Sepertinya kamu sudah punya akun web{" "}
          <span className="font-semibold">{candidate.maskedEmail}</span>.
          Masukkan password untuk gabungkan akun, dan VIP, history, serta
          semua keuntungan akun akan jadi satu.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setModalOpen(true)}
            disabled={isPending}
          >
            Gabungkan akun
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSkip}
            disabled={isPending}
          >
            Skip
          </Button>
        </div>
      </section>

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
                  Gabungkan akun
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/64">
                  Masukkan password akun web {candidate.maskedEmail} untuk
                  konfirmasi.
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
                  Password akun web
                </span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
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
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Gabungkan
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
