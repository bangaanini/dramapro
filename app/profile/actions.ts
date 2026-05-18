"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  findMergeCandidate,
  getCurrentUser,
  mergeUsers,
  setTelegramUsername,
  setupWebAccount,
} from "@/lib/user-auth";

export async function setupWebAccountAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/profile/setup-web");
  }

  if (user.hasWebAccount) {
    redirect("/profile/password");
  }

  const result = await setupWebAccount({
    userId: user.id,
    email,
    password,
    confirmPassword,
  });

  if (!result.ok) {
    redirect(
      `/profile/setup-web?error=${encodeURIComponent(result.error)}&email=${encodeURIComponent(email)}`,
    );
  }

  revalidatePath("/profile");
  redirect("/profile?welcome=web");
}

export async function mergeWebAccountAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  const user = await getCurrentUser();

  if (!user) {
    return { ok: false as const, error: "Sesi habis. Silakan login ulang." };
  }

  if (!user.telegramUsername) {
    return {
      ok: false as const,
      error: "Akun ini tidak punya Telegram username.",
    };
  }

  const candidate = await findMergeCandidate(user.id, user.telegramUsername);

  if (!candidate) {
    return {
      ok: false as const,
      error: "Kandidat merge tidak lagi tersedia.",
    };
  }

  const result = await mergeUsers({
    winnerId: candidate.id,
    loserId: user.id,
    providedPassword: password,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  revalidatePath("/profile");
  return { ok: true as const };
}

export async function connectTelegramAction(formData: FormData) {
  const telegramUsername = String(formData.get("telegramUsername") ?? "");

  const user = await getCurrentUser();

  if (!user) {
    return { ok: false as const, error: "Sesi habis. Silakan login ulang." };
  }

  if (user.telegramId) {
    return {
      ok: false as const,
      error: "Akun ini sudah terhubung dengan Telegram.",
    };
  }

  const result = await setTelegramUsername({
    userId: user.id,
    telegramUsername,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  revalidatePath("/profile");
  return { ok: true as const };
}

export async function dismissMergeBannerAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "").trim();

  if (!candidateId) {
    return { ok: false as const, error: "Kandidat tidak valid." };
  }

  const cookieStore = await cookies();
  cookieStore.set(`dramapro_merge_dismissed_${candidateId}`, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/profile");
  return { ok: true as const };
}
