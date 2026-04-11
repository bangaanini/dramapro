"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authenticateAdmin,
  createAdminSession,
  getCurrentAdmin,
  deleteCurrentAdminSession,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

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
  redirect("/admin/users");
}

export async function logoutAdminAction() {
  await deleteCurrentAdminSession();
  redirect("/admin/login");
}

function parsePositiveInt(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function slugifyVipPlan(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function requireAdminSession() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export async function saveVipSettingsAction(formData: FormData) {
  await requireAdminSession();

  const isEnabled = String(formData.get("isEnabled") ?? "") === "on";
  const lockFromEpisode = parsePositiveInt(formData.get("lockFromEpisode"), 0);

  await prisma.vipSettings.upsert({
    where: { id: "global" },
    update: {
      isEnabled,
      lockFromEpisode: isEnabled ? Math.max(lockFromEpisode, 1) : 0,
    },
    create: {
      id: "global",
      isEnabled,
      lockFromEpisode: isEnabled ? Math.max(lockFromEpisode, 1) : 0,
    },
  });

  revalidatePath("/admin/vip-settings");
  redirect("/admin/vip-settings?saved=1");
}

export async function createVipPricePlanAction(formData: FormData) {
  await requireAdminSession();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const currency = String(formData.get("currency") ?? "IDR").trim().toUpperCase() || "IDR";
  const durationDays = parsePositiveInt(formData.get("durationDays"), 0);
  const sortOrder = parsePositiveInt(formData.get("sortOrder"), 0);
  const priceAmount = parsePositiveInt(formData.get("priceAmount"), 0);
  const isActive = String(formData.get("isActive") ?? "") === "on";

  if (!name) {
    redirect("/admin/vip-pricing?error=Nama%20paket%20wajib%20diisi");
  }

  if (durationDays <= 0 || priceAmount <= 0) {
    redirect("/admin/vip-pricing?error=Durasi%20dan%20harga%20harus%20lebih%20dari%200");
  }

  const slug = slugifyVipPlan(String(formData.get("slug") ?? "") || name);

  if (!slug) {
    redirect("/admin/vip-pricing?error=Slug%20paket%20tidak%20valid");
  }

  await prisma.vipPricePlan.create({
    data: {
      name,
      slug,
      description,
      currency,
      durationDays,
      sortOrder,
      priceAmount,
      isActive,
    },
  });

  revalidatePath("/admin/vip-pricing");
  redirect("/admin/vip-pricing?saved=1");
}

export async function toggleVipPricePlanAction(formData: FormData) {
  await requireAdminSession();

  const id = String(formData.get("id") ?? "");
  const nextActive = String(formData.get("nextActive") ?? "") === "true";

  if (!id) {
    redirect("/admin/vip-pricing?error=Plan%20tidak%20ditemukan");
  }

  await prisma.vipPricePlan.update({
    where: { id },
    data: { isActive: nextActive },
  });

  revalidatePath("/admin/vip-pricing");
  redirect("/admin/vip-pricing?saved=1");
}

export async function saveAffiliateSettingsAction(formData: FormData) {
  await requireAdminSession();

  const isEnabled = String(formData.get("isEnabled") ?? "") === "on";
  const cookieTtlDays = Math.max(parsePositiveInt(formData.get("cookieTtlDays"), 30), 1);
  const minimumWithdrawalAmount = Math.max(
    parsePositiveInt(formData.get("minimumWithdrawalAmount"), 10000),
    1000,
  );

  await prisma.affiliateSettings.upsert({
    where: { id: "global" },
    update: {
      isEnabled,
      cookieTtlDays,
      minimumWithdrawalAmount,
      bronzeMinActiveReferrals: parsePositiveInt(
        formData.get("bronzeMinActiveReferrals"),
        0,
      ),
      bronzeCommissionRate: Math.min(
        parsePositiveInt(formData.get("bronzeCommissionRate"), 10),
        100,
      ),
      silverMinActiveReferrals: parsePositiveInt(
        formData.get("silverMinActiveReferrals"),
        5,
      ),
      silverCommissionRate: Math.min(
        parsePositiveInt(formData.get("silverCommissionRate"), 15),
        100,
      ),
      goldMinActiveReferrals: parsePositiveInt(
        formData.get("goldMinActiveReferrals"),
        20,
      ),
      goldCommissionRate: Math.min(
        parsePositiveInt(formData.get("goldCommissionRate"), 20),
        100,
      ),
      platinumMinActiveReferrals: parsePositiveInt(
        formData.get("platinumMinActiveReferrals"),
        50,
      ),
      platinumCommissionRate: Math.min(
        parsePositiveInt(formData.get("platinumCommissionRate"), 25),
        100,
      ),
      commissionNotes: String(formData.get("commissionNotes") ?? "").trim(),
      withdrawalNotes: String(formData.get("withdrawalNotes") ?? "").trim(),
      otherTerms: String(formData.get("otherTerms") ?? "").trim(),
    },
    create: {
      id: "global",
      isEnabled,
      cookieTtlDays,
      minimumWithdrawalAmount,
      bronzeMinActiveReferrals: parsePositiveInt(
        formData.get("bronzeMinActiveReferrals"),
        0,
      ),
      bronzeCommissionRate: Math.min(
        parsePositiveInt(formData.get("bronzeCommissionRate"), 10),
        100,
      ),
      silverMinActiveReferrals: parsePositiveInt(
        formData.get("silverMinActiveReferrals"),
        5,
      ),
      silverCommissionRate: Math.min(
        parsePositiveInt(formData.get("silverCommissionRate"), 15),
        100,
      ),
      goldMinActiveReferrals: parsePositiveInt(
        formData.get("goldMinActiveReferrals"),
        20,
      ),
      goldCommissionRate: Math.min(
        parsePositiveInt(formData.get("goldCommissionRate"), 20),
        100,
      ),
      platinumMinActiveReferrals: parsePositiveInt(
        formData.get("platinumMinActiveReferrals"),
        50,
      ),
      platinumCommissionRate: Math.min(
        parsePositiveInt(formData.get("platinumCommissionRate"), 25),
        100,
      ),
      commissionNotes: String(formData.get("commissionNotes") ?? "").trim(),
      withdrawalNotes: String(formData.get("withdrawalNotes") ?? "").trim(),
      otherTerms: String(formData.get("otherTerms") ?? "").trim(),
    },
  });

  revalidatePath("/admin/affiliate-settings");
  revalidatePath("/affiliate");
  redirect("/admin/affiliate-settings?saved=1");
}

export async function updateAffiliateWithdrawalStatusAction(formData: FormData) {
  await requireAdminSession();

  const id = String(formData.get("id") ?? "").trim();
  const nextStatus = String(formData.get("nextStatus") ?? "").trim();

  if (!id) {
    redirect("/admin/affiliate-settings?error=Withdrawal%20tidak%20ditemukan");
  }

  if (!["approved", "rejected", "paid"].includes(nextStatus)) {
    redirect("/admin/affiliate-settings?error=Status%20withdrawal%20tidak%20valid");
  }

  await prisma.affiliateWithdrawal.update({
    where: { id },
    data: {
      status: nextStatus as "approved" | "rejected" | "paid",
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/admin/affiliate-settings");
  revalidatePath("/affiliate");
  redirect("/admin/affiliate-settings?saved=1");
}
