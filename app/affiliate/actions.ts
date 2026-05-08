"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/app/generated/prisma/client";
import { type TelegramInlineButtonConfig } from "@/lib/app-settings";
import {
  calculateAffiliateAvailableBalance,
  getAffiliateSettings,
} from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import { normalizeTelegramBotUsername } from "@/lib/telegram-partner-bots";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";

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

function parseLimitedText(value: FormDataEntryValue | null, maxLength: number) {
  return parseOptionalText(value).slice(0, maxLength);
}

function parseOptionalButtonUrl(
  value: FormDataEntryValue | null,
  fieldLabel: string,
) {
  const rawValue = parseOptionalText(value);

  if (!rawValue) {
    return "";
  }

  return parseOptionalUrl(rawValue, fieldLabel);
}

function readTelegramInlineButtons(formData: FormData) {
  const buttons: TelegramInlineButtonConfig[] = [];

  for (let index = 0; index < 10; index += 1) {
    const buttonNumber = index + 1;
    const enabled =
      String(formData.get(`buttonEnabled_${buttonNumber}`) ?? "") === "on";
    const label = parseLimitedText(formData.get(`buttonLabel_${buttonNumber}`), 40);
    const rawUrl = parseOptionalText(formData.get(`buttonUrl_${buttonNumber}`));

    if (enabled && !label) {
      throw new Error(`Label tombol ${buttonNumber} wajib diisi jika tombol diaktifkan.`);
    }

    if (enabled && !rawUrl) {
      throw new Error(`URL tombol ${buttonNumber} wajib diisi jika tombol diaktifkan.`);
    }

    buttons.push({
      enabled,
      id: `button${buttonNumber}`,
      label,
      url: rawUrl
        ? parseOptionalButtonUrl(
            rawUrl,
            `URL tombol ${buttonNumber}`,
          )
        : "",
    });
  }

  return buttons;
}

export async function saveAffiliatePayoutProfileAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/profile/payout-settings");
  }

  const redirectTo = resolveSafeRedirectPath(
    String(formData.get("redirectTo") ?? "/profile/payout-settings"),
  );
  const accountHolderName = String(
    formData.get("accountHolderName") ?? "",
  ).trim();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "")
    .replace(/\s+/g, "")
    .trim();
  const whatsappNumber = String(formData.get("whatsappNumber") ?? "")
    .replace(/\s+/g, "")
    .trim();
  const payoutEmail = String(formData.get("payoutEmail") ?? "")
    .trim()
    .toLowerCase();
  const notes = String(formData.get("notes") ?? "").trim();

  if (
    !accountHolderName ||
    !bankName ||
    !accountNumber ||
    !whatsappNumber ||
    !payoutEmail
  ) {
    redirect(
      `/profile/payout-settings?error=${encodeURIComponent("Lengkapi semua detail payout terlebih dahulu.")}&next=${encodeURIComponent(redirectTo)}`,
    );
  }

  if (!/^\S+@\S+\.\S+$/.test(payoutEmail)) {
    redirect(
      `/profile/payout-settings?error=${encodeURIComponent("Email payout tidak valid.")}&next=${encodeURIComponent(redirectTo)}`,
    );
  }

  await prisma.affiliatePayoutProfile.upsert({
    where: {
      userId: user.id,
    },
    update: {
      accountHolderName,
      bankName,
      accountNumber,
      whatsappNumber,
      payoutEmail,
      notes,
    },
    create: {
      userId: user.id,
      accountHolderName,
      bankName,
      accountNumber,
      whatsappNumber,
      payoutEmail,
      notes,
    },
  });

  revalidatePath("/affiliate");
  revalidatePath("/profile");
  revalidatePath("/profile/payout-settings");

  if (redirectTo === "/profile/payout-settings") {
    redirect(
      `/profile/payout-settings?success=${encodeURIComponent("Detail payout berhasil disimpan.")}`,
    );
  }

  const separator = redirectTo.includes("?") ? "&" : "?";
  redirect(
    `${redirectTo}${separator}payoutSuccess=${encodeURIComponent("Detail payout berhasil disimpan.")}`,
  );
}

export async function requestAffiliateWithdrawalAction() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/affiliate");
  }

  const [settings, payoutProfile, commissionTotals, withdrawalGroups] = await Promise.all([
    getAffiliateSettings(),
    prisma.affiliatePayoutProfile.findUnique({
      where: {
        userId: user.id,
      },
    }),
    prisma.affiliateCommission.groupBy({
      by: ["status"],
      where: {
        affiliateUserId: user.id,
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.affiliateWithdrawal.groupBy({
      by: ["status"],
      where: {
        affiliateUserId: user.id,
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const totalCommission = commissionTotals.reduce((sum, item) => {
    if (item.status === "cancelled") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);

  const totalWithdrawn = withdrawalGroups.reduce((sum, item) => {
    if (item.status !== "approved" && item.status !== "paid") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);

  const totalReserved = withdrawalGroups.reduce((sum, item) => {
    if (item.status !== "pending") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);

  const availableBalance = calculateAffiliateAvailableBalance({
    totalCommission,
    totalWithdrawn,
    totalReserved,
  });

  if (!payoutProfile) {
    redirect(
      `/profile/payout-settings?next=${encodeURIComponent("/affiliate?tab=dashboard")}&error=${encodeURIComponent("Lengkapi detail payout default sebelum menarik komisi affiliate.")}`,
    );
  }

  if (availableBalance < settings.minimumWithdrawalAmount) {
    redirect(
      `/affiliate?tab=history&error=${encodeURIComponent(
        `Saldo affiliate belum mencapai minimum penarikan ${settings.minimumWithdrawalAmount}.`,
      )}`,
    );
  }

  await prisma.affiliateWithdrawal.create({
    data: {
      affiliateUserId: user.id,
      amount: availableBalance,
      payoutAccountHolderName: payoutProfile.accountHolderName,
      payoutBankName: payoutProfile.bankName,
      payoutAccountNumber: payoutProfile.accountNumber,
      payoutWhatsappNumber: payoutProfile.whatsappNumber,
      payoutEmail: payoutProfile.payoutEmail,
      notes: payoutProfile.notes,
    },
  });

  revalidatePath("/affiliate");
  revalidatePath("/admin/affiliate-settings");
  redirect("/affiliate?tab=history&success=1");
}

export async function requestPartnerBotWithdrawalAction(botUsername: string) {
  const user = await getCurrentUser();
  const normalizedBotUsername = normalizeTelegramBotUsername(botUsername);

  if (!user) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/affiliate/partner-bot/${normalizedBotUsername}?tab=balance`,
      )}`,
    );
  }

  if (!normalizedBotUsername) {
    redirect("/affiliate?error=Bot%20partner%20tidak%20valid");
  }

  const partnerBot = await prisma.telegramPartnerBot.findFirst({
    where: {
      botUsername: normalizedBotUsername,
      ownerUserId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!partnerBot) {
    redirect("/affiliate?error=Bot%20partner%20tidak%20ditemukan");
  }

  const balancePath = `/affiliate/partner-bot/${normalizedBotUsername}?tab=balance`;
  const [settings, payoutProfile, commissionTotals, withdrawalGroups] =
    await Promise.all([
      getAffiliateSettings(),
      prisma.affiliatePayoutProfile.findUnique({
        where: {
          userId: user.id,
        },
      }),
      prisma.affiliateCommission.groupBy({
        by: ["status"],
        where: {
          affiliateUserId: user.id,
          partnerBotId: partnerBot.id,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.affiliateWithdrawal.groupBy({
        by: ["status"],
        where: {
          affiliateUserId: user.id,
          partnerBotId: partnerBot.id,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

  const totalCommission = commissionTotals.reduce((sum, item) => {
    if (item.status === "cancelled") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);
  const totalWithdrawn = withdrawalGroups.reduce((sum, item) => {
    if (item.status !== "approved" && item.status !== "paid") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);
  const totalReserved = withdrawalGroups.reduce((sum, item) => {
    if (item.status !== "pending") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);
  const availableBalance = calculateAffiliateAvailableBalance({
    totalCommission,
    totalWithdrawn,
    totalReserved,
  });

  if (!payoutProfile) {
    redirect(
      `/profile/payout-settings?next=${encodeURIComponent(balancePath)}&error=${encodeURIComponent("Lengkapi detail payout default sebelum menarik komisi bot partner.")}`,
    );
  }

  if (availableBalance < settings.minimumWithdrawalAmount) {
    redirect(
      `${balancePath}&error=${encodeURIComponent(
        `Saldo bot partner belum mencapai minimum penarikan ${settings.minimumWithdrawalAmount}.`,
      )}`,
    );
  }

  await prisma.affiliateWithdrawal.create({
    data: {
      affiliateUserId: user.id,
      partnerBotId: partnerBot.id,
      amount: availableBalance,
      payoutAccountHolderName: payoutProfile.accountHolderName,
      payoutBankName: payoutProfile.bankName,
      payoutAccountNumber: payoutProfile.accountNumber,
      payoutWhatsappNumber: payoutProfile.whatsappNumber,
      payoutEmail: payoutProfile.payoutEmail,
      notes: payoutProfile.notes,
    },
  });

  revalidatePath("/affiliate");
  revalidatePath(`/affiliate/partner-bot/${normalizedBotUsername}`);
  revalidatePath("/admin/affiliate-withdrawals");
  redirect(
    `${balancePath}&success=${encodeURIComponent("Request withdrawal bot partner berhasil diajukan.")}`,
  );
}

export async function updatePartnerBotPresentationSettingsAction(
  botUsername: string,
  formData: FormData,
) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/affiliate/partner-bot/${normalizeTelegramBotUsername(botUsername)}`,
      )}`,
    );
  }

  const normalizedBotUsername = normalizeTelegramBotUsername(botUsername);

  if (!normalizedBotUsername) {
    redirect("/affiliate?error=Bot%20partner%20tidak%20valid");
  }

  const partnerBot = await prisma.telegramPartnerBot.findUnique({
    where: {
      botUsername: normalizedBotUsername,
    },
    select: {
      id: true,
      ownerUserId: true,
    },
  });

  if (!partnerBot || partnerBot.ownerUserId !== user.id) {
    redirect("/affiliate?error=Bot%20partner%20tidak%20ditemukan");
  }

  try {
    const welcomeMessage = parseLimitedText(formData.get("welcomeMessage"), 3000);

    if (welcomeMessage.length < 20) {
      throw new Error("Pesan sambutan minimal 20 karakter.");
    }

    const inlineButtons = readTelegramInlineButtons(formData);

    if (!inlineButtons.some((button) => button.enabled && button.label && button.url)) {
      throw new Error("Minimal aktifkan satu tombol inline.");
    }

    await prisma.telegramPartnerBot.update({
      where: {
        id: partnerBot.id,
      },
      data: {
        welcomeMessage,
        inlineButtons: inlineButtons as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Pengaturan partner bot gagal disimpan.";
    redirect(
      `/affiliate/partner-bot/${normalizedBotUsername}?error=${encodeURIComponent(message)}`,
    );
  }

  revalidatePath("/affiliate");
  revalidatePath(`/affiliate/partner-bot/${normalizedBotUsername}`);
  redirect(
    `/affiliate/partner-bot/${normalizedBotUsername}?saved=${encodeURIComponent(
      "Pengaturan bot partner berhasil disimpan.",
    )}`,
  );
}
