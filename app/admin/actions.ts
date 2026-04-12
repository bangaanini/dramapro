"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/app/generated/prisma/client";
import {
  authenticateAdmin,
  changeAdminPassword,
  createAdminSession,
  getCurrentAdmin,
  deleteCurrentAdminSession,
} from "@/lib/admin-auth";
import { encryptPaymentSecret } from "@/lib/payment-crypto";
import {
  getPaymentGatewayDefinition,
  isPaymentGatewayProvider,
} from "@/lib/payment-gateways";
import { resolvePaymenkuEnabledChannelCodes } from "@/lib/paymenku";
import { prisma } from "@/lib/prisma";
import { normalizeTelegramBotUsername } from "@/lib/telegram-partner-bots";

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

export async function changeAdminPasswordAction(formData: FormData) {
  const admin = await requireAdminSession();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !nextPassword || !confirmPassword) {
    redirect("/admin/password?error=Semua%20field%20password%20wajib%20diisi");
  }

  if (nextPassword.length < 8) {
    redirect("/admin/password?error=Password%20baru%20minimal%208%20karakter");
  }

  if (nextPassword !== confirmPassword) {
    redirect("/admin/password?error=Konfirmasi%20password%20tidak%20sama");
  }

  try {
    await changeAdminPassword({
      adminUserId: admin.id,
      currentPassword,
      nextPassword,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Password admin gagal diperbarui.";
    redirect(`/admin/password?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/password");
  redirect("/admin/password?saved=1");
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

function parseVipPricePlanPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const badgeText = String(formData.get("badgeText") ?? "").trim().slice(0, 32);
  const currency = String(formData.get("currency") ?? "IDR").trim().toUpperCase() || "IDR";
  const durationDays = parsePositiveInt(formData.get("durationDays"), 0);
  const sortOrder = parsePositiveInt(formData.get("sortOrder"), 0);
  const priceAmount = parsePositiveInt(formData.get("priceAmount"), 0);
  const isActive = String(formData.get("isActive") ?? "") === "on";
  const slug = slugifyVipPlan(String(formData.get("slug") ?? "") || name);

  return {
    name,
    description,
    badgeText,
    currency,
    durationDays,
    sortOrder,
    priceAmount,
    isActive,
    slug,
  };
}

function validateVipPricePlanPayload(
  payload: ReturnType<typeof parseVipPricePlanPayload>,
) {
  if (!payload.name) {
    redirect("/admin/vip-pricing?error=Nama%20paket%20wajib%20diisi");
  }

  if (payload.durationDays <= 0 || payload.priceAmount <= 0) {
    redirect("/admin/vip-pricing?error=Durasi%20dan%20harga%20harus%20lebih%20dari%200");
  }

  if (payload.priceAmount < 1000) {
    redirect(
      "/admin/vip-pricing?error=Harga%20minimum%20untuk%20QRIS%20Paymenku%20adalah%20Rp%201.000",
    );
  }

  if (!payload.slug) {
    redirect("/admin/vip-pricing?error=Slug%20paket%20tidak%20valid");
  }
}

async function requireAdminSession() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

function parseOptionalText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseOptionalUrl(value: FormDataEntryValue | null, fieldLabel: string) {
  const rawValue = parseOptionalText(value);

  if (!rawValue) {
    return "";
  }

  const normalized = rawValue.startsWith("http://") || rawValue.startsWith("https://")
    ? rawValue
    : `https://${rawValue}`;

  try {
    return new URL(normalized).toString();
  } catch {
    throw new Error(`${fieldLabel} tidak valid.`);
  }
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

  const payload = parseVipPricePlanPayload(formData);
  validateVipPricePlanPayload(payload);

  try {
    await prisma.vipPricePlan.create({
      data: payload,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/admin/vip-pricing?error=Slug%20paket%20sudah%20dipakai");
    }

    throw error;
  }

  revalidatePath("/admin/vip-pricing");
  redirect("/admin/vip-pricing?saved=1");
}

export async function updateVipPricePlanAction(formData: FormData) {
  await requireAdminSession();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/admin/vip-pricing?error=Plan%20tidak%20ditemukan");
  }

  const payload = parseVipPricePlanPayload(formData);
  validateVipPricePlanPayload(payload);

  try {
    await prisma.vipPricePlan.update({
      where: { id },
      data: payload,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        redirect("/admin/vip-pricing?error=Slug%20paket%20sudah%20dipakai");
      }

      if (error.code === "P2025") {
        redirect("/admin/vip-pricing?error=Plan%20tidak%20ditemukan");
      }
    }

    throw error;
  }

  revalidatePath("/admin/vip-pricing");
  revalidatePath("/vip");
  redirect("/admin/vip-pricing?saved=1");
}

export async function deleteVipPricePlanAction(formData: FormData) {
  await requireAdminSession();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/admin/vip-pricing?error=Plan%20tidak%20ditemukan");
  }

  const paymentCount = await prisma.vipPayment.count({
    where: {
      vipPricePlanId: id,
    },
  });

  if (paymentCount > 0) {
    redirect(
      "/admin/vip-pricing?error=Paket%20sudah%20punya%20riwayat%20transaksi.%20Nonaktifkan%20paket%20agar%20riwayat%20pembayaran%20tetap%20aman",
    );
  }

  try {
    await prisma.vipPricePlan.delete({
      where: { id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirect("/admin/vip-pricing?error=Plan%20tidak%20ditemukan");
    }

    throw error;
  }

  revalidatePath("/admin/vip-pricing");
  revalidatePath("/vip");
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

export async function saveTelegramSettingsAction(formData: FormData) {
  await requireAdminSession();

  try {
    const botToken = parseOptionalText(formData.get("botToken"));
    const botUsername = parseOptionalText(formData.get("botUsername")).replace(/^@/, "");
    const webhookSecret = parseOptionalText(formData.get("webhookSecret"));
    const supportUrl = parseOptionalUrl(
      formData.get("telegramSupportUrl"),
      "Telegram support URL",
    );
    const miniAppUrl = parseOptionalUrl(
      formData.get("telegramMiniAppUrl"),
      "Telegram mini app URL",
    );
    const siteUrl = parseOptionalUrl(formData.get("siteUrl"), "Site URL");

    const existing = await prisma.appSettings.findUnique({
      where: { id: "global" },
      select: {
        telegramBotTokenCiphertext: true,
        telegramWebhookSecretCiphertext: true,
      },
    });

    let telegramBotTokenCiphertext =
      existing?.telegramBotTokenCiphertext ?? null;
    let telegramWebhookSecretCiphertext =
      existing?.telegramWebhookSecretCiphertext ?? null;

    if (botToken) {
      telegramBotTokenCiphertext = encryptPaymentSecret(botToken);
    }

    if (webhookSecret) {
      telegramWebhookSecretCiphertext = encryptPaymentSecret(webhookSecret);
    }

    await prisma.appSettings.upsert({
      where: { id: "global" },
      update: {
        telegramBotUsername: botUsername,
        telegramBotTokenCiphertext,
        telegramWebhookSecretCiphertext,
        telegramSupportUrl: supportUrl,
        telegramMiniAppUrl: miniAppUrl,
        siteUrl,
      },
      create: {
        id: "global",
        telegramBotUsername: botUsername,
        telegramBotTokenCiphertext,
        telegramWebhookSecretCiphertext,
        telegramSupportUrl: supportUrl,
        telegramMiniAppUrl: miniAppUrl,
        siteUrl,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pengaturan Telegram gagal disimpan.";
    redirect(`/admin/settings?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/affiliate");
  revalidatePath("/profile");
  redirect("/admin/settings?saved=telegram");
}

export async function saveSeoSettingsAction(formData: FormData) {
  await requireAdminSession();

  try {
    const siteUrl = parseOptionalUrl(formData.get("siteUrl"), "URL situs");
    const siteName = parseOptionalText(formData.get("siteName"));
    const siteDescription = parseOptionalText(formData.get("siteDescription"));
    const siteLogoUrl = parseOptionalUrl(formData.get("siteLogoUrl"), "Logo situs");

    await prisma.appSettings.upsert({
      where: { id: "global" },
      update: {
        siteUrl,
        siteName,
        siteDescription,
        siteLogoUrl,
      },
      create: {
        id: "global",
        siteUrl,
        siteName,
        siteDescription,
        siteLogoUrl,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pengaturan SEO gagal disimpan.";
    redirect(`/admin/settings?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/library");
  revalidatePath("/affiliate");
  revalidatePath("/profile");
  revalidatePath("/vip");
  redirect("/admin/settings?saved=seo");
}

function parseTelegramPartnerBotPayload(formData: FormData) {
  const botUsername = normalizeTelegramBotUsername(
    String(formData.get("botUsername") ?? ""),
  );
  const ownerUserId = String(formData.get("ownerUserId") ?? "").trim();
  const botToken = String(formData.get("botToken") ?? "").trim();
  const webhookSecret = String(formData.get("webhookSecret") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const isEnabled = String(formData.get("isEnabled") ?? "") === "on";

  return {
    botUsername,
    ownerUserId,
    botToken,
    webhookSecret,
    notes,
    isEnabled,
  };
}

async function assertTelegramPartnerBotOwner(ownerUserId: string) {
  if (!ownerUserId) {
    redirect("/admin/telegram-bots?error=Owner%20affiliate%20wajib%20dipilih");
  }

  const owner = await prisma.user.findUnique({
    where: {
      id: ownerUserId,
    },
    select: {
      id: true,
    },
  });

  if (!owner) {
    redirect("/admin/telegram-bots?error=Owner%20affiliate%20tidak%20ditemukan");
  }
}

export async function createTelegramPartnerBotAction(formData: FormData) {
  await requireAdminSession();

  const payload = parseTelegramPartnerBotPayload(formData);

  if (!payload.botUsername) {
    redirect("/admin/telegram-bots?error=Username%20bot%20partner%20wajib%20diisi");
  }

  if (!payload.botToken) {
    redirect("/admin/telegram-bots?error=Token%20bot%20partner%20wajib%20diisi");
  }

  await assertTelegramPartnerBotOwner(payload.ownerUserId);

  try {
    await prisma.telegramPartnerBot.create({
      data: {
        botUsername: payload.botUsername,
        botTokenCiphertext: encryptPaymentSecret(payload.botToken),
        webhookSecretCiphertext: payload.webhookSecret
          ? encryptPaymentSecret(payload.webhookSecret)
          : null,
        ownerUserId: payload.ownerUserId,
        isEnabled: payload.isEnabled,
        notes: payload.notes,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/admin/telegram-bots?error=Username%20bot%20partner%20sudah%20dipakai");
    }

    const message =
      error instanceof Error
        ? error.message
        : "Bot partner gagal ditambahkan.";
    redirect(`/admin/telegram-bots?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/telegram-bots");
  redirect("/admin/telegram-bots?saved=created");
}

export async function updateTelegramPartnerBotAction(formData: FormData) {
  await requireAdminSession();

  const id = String(formData.get("id") ?? "").trim();
  const payload = parseTelegramPartnerBotPayload(formData);

  if (!id) {
    redirect("/admin/telegram-bots?error=Bot%20partner%20tidak%20ditemukan");
  }

  if (!payload.botUsername) {
    redirect("/admin/telegram-bots?error=Username%20bot%20partner%20wajib%20diisi");
  }

  await assertTelegramPartnerBotOwner(payload.ownerUserId);

  const existing = await prisma.telegramPartnerBot.findUnique({
    where: {
      id,
    },
    select: {
      botTokenCiphertext: true,
      webhookSecretCiphertext: true,
    },
  });

  if (!existing) {
    redirect("/admin/telegram-bots?error=Bot%20partner%20tidak%20ditemukan");
  }

  try {
    await prisma.telegramPartnerBot.update({
      where: {
        id,
      },
      data: {
        botUsername: payload.botUsername,
        botTokenCiphertext: payload.botToken
          ? encryptPaymentSecret(payload.botToken)
          : existing.botTokenCiphertext,
        webhookSecretCiphertext: payload.webhookSecret
          ? encryptPaymentSecret(payload.webhookSecret)
          : existing.webhookSecretCiphertext,
        ownerUserId: payload.ownerUserId,
        isEnabled: payload.isEnabled,
        notes: payload.notes,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        redirect("/admin/telegram-bots?error=Username%20bot%20partner%20sudah%20dipakai");
      }

      if (error.code === "P2025") {
        redirect("/admin/telegram-bots?error=Bot%20partner%20tidak%20ditemukan");
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "Bot partner gagal diperbarui.";
    redirect(`/admin/telegram-bots?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/telegram-bots");
  redirect("/admin/telegram-bots?saved=updated");
}

export async function deleteTelegramPartnerBotAction(formData: FormData) {
  await requireAdminSession();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/admin/telegram-bots?error=Bot%20partner%20tidak%20ditemukan");
  }

  try {
    await prisma.telegramPartnerBot.delete({
      where: {
        id,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirect("/admin/telegram-bots?error=Bot%20partner%20tidak%20ditemukan");
    }

    throw error;
  }

  revalidatePath("/admin/telegram-bots");
  redirect("/admin/telegram-bots?saved=deleted");
}

export async function updateAffiliateWithdrawalStatusAction(formData: FormData) {
  await requireAdminSession();

  const id = String(formData.get("id") ?? "").trim();
  const nextStatus = String(formData.get("nextStatus") ?? "").trim();

  if (!id) {
    redirect("/admin/affiliate-withdrawals?error=Withdrawal%20tidak%20ditemukan");
  }

  if (!["approved", "rejected", "paid"].includes(nextStatus)) {
    redirect("/admin/affiliate-withdrawals?error=Status%20withdrawal%20tidak%20valid");
  }

  await prisma.affiliateWithdrawal.update({
    where: { id },
    data: {
      status: nextStatus as "approved" | "rejected" | "paid",
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/admin/affiliate-settings");
  revalidatePath("/admin/affiliate-withdrawals");
  revalidatePath("/affiliate");
  redirect("/admin/affiliate-withdrawals?saved=1");
}

export async function savePaymentGatewayConfigAction(formData: FormData) {
  await requireAdminSession();

  const provider = String(formData.get("provider") ?? "").trim();

  if (!isPaymentGatewayProvider(provider)) {
    redirect("/admin/payment-gateways?error=Gateway%20tidak%20valid");
  }

  const definition = getPaymentGatewayDefinition(provider);

  if (!definition) {
    redirect("/admin/payment-gateways?error=Gateway%20tidak%20dikenali");
  }

  const displayName =
    String(formData.get("displayName") ?? "").trim() || definition.displayName;
  const isEnabled = String(formData.get("isEnabled") ?? "") === "on";
  const defaultChannelCode =
    String(formData.get("defaultChannelCode") ?? "qris").trim().toLowerCase() ||
    "qris";
  const merchantId = String(formData.get("merchantId") ?? "").trim();
  const clientKey = String(formData.get("clientKey") ?? "").trim();
  const secret = String(formData.get("secret") ?? "").trim();
  const configJsonRaw = String(formData.get("configJson") ?? "").trim();
  const enabledChannels = formData
    .getAll("enabledChannels")
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);

  let configJson: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;

  if (configJsonRaw) {
    try {
      configJson = JSON.parse(configJsonRaw) as Prisma.InputJsonValue;
    } catch {
      redirect("/admin/payment-gateways?error=Config%20JSON%20tidak%20valid");
    }
  }

  if (provider === "paymenku") {
    const baseConfig =
      configJson !== Prisma.DbNull && configJson && typeof configJson === "object"
        ? { ...(configJson as Record<string, unknown>) }
        : {};

    configJson = {
      ...baseConfig,
      enabledChannels: resolvePaymenkuEnabledChannelCodes({
        enabledChannels,
      }),
    } satisfies Prisma.InputJsonValue;
  }

  const existing = await prisma.paymentGatewayConfig.findUnique({
    where: { provider },
    select: { secretCiphertext: true },
  });

  let secretCiphertext = existing?.secretCiphertext ?? null;

  if (secret) {
    try {
      secretCiphertext = encryptPaymentSecret(secret);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Credential gateway gagal dienkripsi.";
      redirect(
        `/admin/payment-gateways?error=${encodeURIComponent(message)}`,
      );
    }
  }

  await prisma.paymentGatewayConfig.upsert({
    where: { provider },
    update: {
      displayName,
      isEnabled,
      defaultChannelCode,
      merchantId,
      clientKey,
      secretCiphertext,
      configJson,
      lastError: "",
      lastValidatedAt: new Date(),
    },
    create: {
      provider,
      displayName,
      isEnabled,
      defaultChannelCode,
      merchantId,
      clientKey,
      secretCiphertext,
      configJson,
      lastValidatedAt: new Date(),
    },
  });

  revalidatePath("/admin/payment-gateways");
  redirect("/admin/payment-gateways?saved=1");
}

export async function setActivePaymentGatewayAction(formData: FormData) {
  await requireAdminSession();

  const provider = String(formData.get("provider") ?? "").trim();

  if (!isPaymentGatewayProvider(provider)) {
    redirect("/admin/payment-gateways?error=Gateway%20checkout%20tidak%20valid");
  }

  const definition = getPaymentGatewayDefinition(provider);

  if (!definition?.capability.implemented) {
    redirect(
      "/admin/payment-gateways?error=Gateway%20ini%20baru%20siap%20konfigurasi,%20belum%20bisa%20dipakai%20checkout",
    );
  }

  const config = await prisma.paymentGatewayConfig.findUnique({
    where: { provider },
    select: {
      isEnabled: true,
    },
  });

  if (!config?.isEnabled && !(provider === "paymenku" && process.env.PAYMENKU_API_KEY)) {
    redirect("/admin/payment-gateways?error=Aktifkan%20dan%20isi%20credential%20gateway%20terlebih%20dahulu");
  }

  await prisma.paymentGatewaySettings.upsert({
    where: { id: "global" },
    update: {
      activeProvider: provider,
    },
    create: {
      id: "global",
      activeProvider: provider,
    },
  });

  revalidatePath("/admin/payment-gateways");
  revalidatePath("/vip");
  redirect("/admin/payment-gateways?saved=1");
}

export async function deleteUserAction(formData: FormData) {
  await requireAdminSession();

  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    redirect("/admin/users?error=User%20tidak%20ditemukan");
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/affiliate");
  revalidatePath("/favorites");
  revalidatePath("/history");
  revalidatePath("/profile");
  redirect("/admin/users?saved=1");
}

export async function updateUserAffiliateCommissionOverrideAction(formData: FormData) {
  await requireAdminSession();

  const userId = String(formData.get("userId") ?? "").trim();
  const rawRate = String(formData.get("affiliateCommissionOverrideRate") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/users").trim();
  const safeRedirectTo = redirectTo.startsWith("/admin/users")
    ? redirectTo
    : "/admin/users";

  if (!userId) {
    redirect(`${safeRedirectTo}${safeRedirectTo.includes("?") ? "&" : "?"}error=User%20tidak%20ditemukan`);
  }

  let affiliateCommissionOverrideRate: number | null = null;

  if (rawRate) {
    const parsedRate = Number.parseInt(rawRate, 10);

    if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      redirect(
        `${safeRedirectTo}${safeRedirectTo.includes("?") ? "&" : "?"}error=Komisi%20khusus%20harus%20antara%200%20sampai%20100`,
      );
    }

    affiliateCommissionOverrideRate = parsedRate;
  }

  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        affiliateCommissionOverrideRate,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirect(`${safeRedirectTo}${safeRedirectTo.includes("?") ? "&" : "?"}error=User%20tidak%20ditemukan`);
    }

    throw error;
  }

  revalidatePath("/admin/users");
  revalidatePath("/affiliate");
  redirect(`${safeRedirectTo}${safeRedirectTo.includes("?") ? "&" : "?"}saved=commission`);
}
