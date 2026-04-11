"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  calculateAffiliateAvailableBalance,
  getAffiliateSettings,
} from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";

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
