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
  resetUserPassword,
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
  const telegramUsernameRaw = String(formData.get("telegramUsername") ?? "");
  const telegramUsername = telegramUsernameRaw.trim() || null;
  const next = resolveSafeRedirectPath(String(formData.get("next") ?? "/profile"));

  const result = await registerUser({
    name,
    email,
    password,
    telegramUsername,
  });

  if (!result.ok) {
    redirect(
      `/sign-up?error=${encodeURIComponent(result.error)}&next=${encodeURIComponent(next)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&telegramUsername=${encodeURIComponent(telegramUsernameRaw)}`,
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

export async function resetPasswordUserAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email.trim() || !newPassword.trim() || !confirmPassword.trim()) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Semua field wajib diisi")}&email=${encodeURIComponent(email)}`,
    );
  }

  if (newPassword.length < 8) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Password minimal 8 karakter")}&email=${encodeURIComponent(email)}`,
    );
  }

  if (newPassword !== confirmPassword) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Konfirmasi password tidak cocok")}&email=${encodeURIComponent(email)}`,
    );
  }

  const result = await resetUserPassword({
    email,
    newPassword,
  });

  if (!result.ok) {
    redirect(
      `/reset-password?error=${encodeURIComponent(result.error)}&email=${encodeURIComponent(email)}`,
    );
  }

  redirect(
    `/reset-password?success=${encodeURIComponent("Password berhasil direset. Silakan masuk dengan password baru.")}`,
  );
}
