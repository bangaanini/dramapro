"use server";

import { redirect } from "next/navigation";

import {
  authenticateUser,
  changeCurrentUserPassword,
  createUserSession,
  deleteCurrentUserSession,
  getCurrentUser,
  registerUser,
  resolveSafeRedirectPath,
} from "@/lib/user-auth";

export async function signInUserAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = resolveSafeRedirectPath(String(formData.get("next") ?? "/profile"));

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
  const next = resolveSafeRedirectPath(String(formData.get("next") ?? "/profile"));

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

export async function changePasswordUserAction(formData: FormData) {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const redirectTo = resolveSafeRedirectPath(
    String(formData.get("redirectTo") ?? "/library"),
  );

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(redirectTo)}`);
  }

  const result = await changeCurrentUserPassword({
    userId: user.id,
    currentPassword,
    nextPassword,
    confirmPassword,
  });

  if (!result.ok) {
    redirect(
      `${redirectTo}?passwordError=${encodeURIComponent(result.error)}`,
    );
  }

  redirect(
    `${redirectTo}?passwordSuccess=${encodeURIComponent("Password berhasil diperbarui.")}`,
  );
}
