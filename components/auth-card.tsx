"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Mail, User, X } from "lucide-react";

import { signInUserAction, signUpUserAction } from "@/app/auth/actions";
import logoImage from "@/2.png";
import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";

type AuthCardProps = {
  mode: AuthMode;
  next: string;
  error?: string | null;
  initialName?: string;
  initialEmail?: string;
  modal?: boolean;
  onClose?: () => void;
};

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return {
      firstName: parts[0] ?? "",
      lastName: "",
    };
  }

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function authHref(mode: AuthMode, next: string) {
  return `/${mode}?next=${encodeURIComponent(next)}`;
}

export function AuthCard({
  mode,
  next,
  error,
  initialName = "",
  initialEmail = "",
  modal = false,
  onClose,
}: AuthCardProps) {
  const initialNameParts = useMemo(() => splitName(initialName), [initialName]);
  const [firstName, setFirstName] = useState(initialNameParts.firstName);
  const [lastName, setLastName] = useState(initialNameParts.lastName);
  const [showPassword, setShowPassword] = useState(false);
  const isSignUp = mode === "sign-up";
  const combinedName = `${firstName} ${lastName}`.trim();

  return (
    <section
      className={cn(
        "relative w-full rounded-[1.65rem] border border-white/10 bg-[#050719]/96 p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.62)] backdrop-blur-2xl sm:rounded-[1.9rem] sm:p-7",
        modal
          ? "max-h-[calc(100dvh_-_5.75rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] max-w-[560px] overflow-x-hidden overflow-y-auto sm:max-h-[calc(100dvh_-_3rem)]"
          : "max-w-[580px] overflow-hidden",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,122,69,0.16),transparent_29%),radial-gradient(circle_at_92%_42%,rgba(255,255,255,0.06),transparent_22%)]" />
      <div className="absolute inset-px rounded-[1.55rem] border border-white/[0.035] sm:rounded-[1.8rem]" />

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-full text-white/46 transition hover:bg-white/8 hover:text-white"
          aria-label="Tutup"
        >
          <X className="size-5" />
        </button>
      ) : (
        <Link
          href={next || "/"}
          className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-full text-white/46 transition hover:bg-white/8 hover:text-white"
          aria-label="Tutup"
        >
          <X className="size-5" />
        </Link>
      )}

      <div className="relative">
        <div className="flex flex-col items-center text-center">
          <div className="relative size-[5.5rem] overflow-hidden rounded-[1.35rem] shadow-[0_18px_48px_rgba(255,122,69,0.28)] sm:size-24">
            <Image
              src={logoImage}
              alt="Layar Drama"
              fill
              priority
              className="object-cover"
              sizes="96px"
            />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {isSignUp ? "Gabung Layar Drama" : "Selamat Datang Kembali"}
          </h1>
          <p className="mt-3 text-sm font-medium text-white/42 sm:text-base">
            {isSignUp
              ? "Buat akun untuk mulai menonton"
              : "Masuk untuk melanjutkan petualangan dramamu"}
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 rounded-[1.15rem] border border-white/7 bg-white/[0.045] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <AuthTab
            active={!isSignUp}
            href={modal ? "?auth=sign-in" : authHref("sign-in", next)}
            onClick={modal ? onClose : undefined}
          >
            Masuk
          </AuthTab>
          <AuthTab
            active={isSignUp}
            href={modal ? "?auth=sign-up" : authHref("sign-up", next)}
            onClick={modal ? onClose : undefined}
          >
            Buat Akun
          </AuthTab>
        </div>

        <form
          action={isSignUp ? signUpUserAction : signInUserAction}
          className="mt-7 space-y-4"
        >
          <input type="hidden" name="next" value={next} />

          {isSignUp ? (
            <>
              <input type="hidden" name="name" value={combinedName} />
              <div className="grid gap-4 sm:grid-cols-2">
                <AuthInput
                  icon={<User className="size-5" />}
                  value={firstName}
                  onValueChange={setFirstName}
                  placeholder="Nama depan"
                  autoComplete="given-name"
                />
                <AuthInput
                  value={lastName}
                  onValueChange={setLastName}
                  placeholder="Nama belakang"
                  autoComplete="family-name"
                />
              </div>
            </>
          ) : null}

          <AuthInput
            icon={<Mail className="size-5" />}
            name="email"
            type="email"
            defaultValue={initialEmail}
            placeholder="Alamat email"
            autoComplete="username"
          />

          <AuthInput
            icon={<Lock className="size-5" />}
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder={isSignUp ? "Kata Sandi (min. 8 karakter)" : "Kata Sandi"}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="inline-flex size-9 items-center justify-center rounded-full text-white/38 transition hover:bg-white/8 hover:text-white"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
              </button>
            }
          />

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="h-14 w-full rounded-[1.05rem] bg-[linear-gradient(90deg,#f0064f,#ff7a45,#ff982f)] px-5 text-base font-semibold text-white shadow-[0_18px_46px_rgba(255,86,49,0.34)] transition hover:brightness-110 active:scale-[0.985]"
          >
            {isSignUp ? "Buat Akun" : "Masuk"}
          </button>
        </form>
      </div>
    </section>
  );
}

function AuthTab({
  active,
  href,
  children,
  onClick,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        if (!onClick) {
          return;
        }

        event.preventDefault();
        const target = href.includes("sign-up") ? "sign-up" : "sign-in";
        const url = new URL(window.location.href);
        url.searchParams.set("auth", target);
        window.history.replaceState(null, "", url.toString());
        window.dispatchEvent(new Event("dramapro-auth-query-change"));
      }}
      className={cn(
        "inline-flex h-[3.25rem] items-center justify-center rounded-[0.9rem] text-sm font-semibold transition sm:h-14 sm:text-base",
        active
          ? "bg-[#020315] text-white shadow-[0_12px_26px_rgba(0,0,0,0.34)]"
          : "text-white/42 hover:bg-white/[0.045] hover:text-white/72",
      )}
    >
      {children}
    </Link>
  );
}

function AuthInput({
  icon,
  trailing,
  value,
  onValueChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const controlledProps =
    value === undefined
      ? {}
      : {
          value,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
            onValueChange?.(event.currentTarget.value),
        };

  return (
    <label className="flex h-[3.75rem] items-center gap-3 rounded-[1.05rem] border border-white/7 bg-[#020416]/72 px-4 text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition focus-within:border-white/16 sm:h-16">
      {icon ? <span className="shrink-0 text-white/34">{icon}</span> : null}
      <input
        {...props}
        {...controlledProps}
        className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/24"
      />
      {trailing}
    </label>
  );
}
