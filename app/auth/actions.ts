"use server";

import { redirect } from "next/navigation";

import {
  authenticateUser,
  createUserSession,
  deleteCurrentUserSession,
  registerUser,
  resolveSafeRedirectPath,
} from "@/lib/user-auth";

export async function signInUserAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = resolveSafeRedirectPath(String(formData.get("next") ?? "/library"));

  if (!email.trim() || !password.trim()) {
    redirect(
      `/sign-in?error=${encodeURIComponent("Email dan password wajib diisi")}&next=${encodeURIComponent(next)}`,
    );
  }

  const user = await authenticateUser(email, password);

  if (!user) {
    redirect(
      `/sign-in?error=${encodeURIComponent("Login gagal. Periksa email dan password.")}&next=${encodeURIComponent(next)}`,
    );
  }

  await createUserSession(user.id);
  redirect(next);
}

export async function signUpUserAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = resolveSafeRedirectPath(String(formData.get("next") ?? "/library"));

  const result = await registerUser({ name, email, password });

  if (!result.ok) {
    redirect(
      `/sign-up?error=${encodeURIComponent(result.error)}&next=${encodeURIComponent(next)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`,
    );
  }

  await createUserSession(result.user.id);
  redirect(next);
}

export async function logoutUserAction() {
  await deleteCurrentUserSession();
  redirect("/");
}
