"use server";

import { redirect } from "next/navigation";

import { createVipPaymentSession } from "@/lib/vip-payments";

function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

export async function createVipCheckoutAction(formData: FormData) {
  const planId = String(formData.get("planId") ?? "").trim();
  const channelCode = String(formData.get("channelCode") ?? "qris").trim().toLowerCase();
  const next = String(formData.get("next") ?? "/vip");

  if (!planId) {
    redirect(`/vip?error=${encodeURIComponent("Pilih paket VIP terlebih dahulu.")}`);
  }

  let session: Awaited<ReturnType<typeof createVipPaymentSession>>;

  try {
    session = await createVipPaymentSession({
      planId,
      channelCode,
      next,
    });
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Gagal membuat transaksi VIP.";
    redirect(
      `/vip?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(
    `/vip/checkout/${session.referenceId}?next=${encodeURIComponent(session.next)}`,
  );
}
