"use server";

import { redirect } from "next/navigation";

import {
  authenticateAdmin,
  createAdminSession,
  deleteCurrentAdminSession,
} from "@/lib/admin-auth";

export async function loginAdminAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email.trim() || !password.trim()) {
    redirect("/admin/login?error=Email%20dan%20password%20wajib%20diisi");
  }

  const admin = await authenticateAdmin(email, password);

  if (!admin) {
    redirect("/admin/login?error=Login%20gagal.%20Periksa%20kredensial%20admin.");
  }

  await createAdminSession(admin.id);
  redirect("/admin/sync");
}

export async function logoutAdminAction() {
  await deleteCurrentAdminSession();
  redirect("/admin/login");
}
