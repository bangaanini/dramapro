"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  calculateAffiliateAvailableBalance,
  getAffiliateSettings,
} from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";

export async function requestAffiliateWithdrawalAction() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/affiliate");
  }

  const [settings, commissionTotals, withdrawalGroups] = await Promise.all([
    getAffiliateSettings(),
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
    },
  });

  revalidatePath("/affiliate");
  revalidatePath("/admin/affiliate-settings");
  redirect("/affiliate?tab=history&success=1");
}
