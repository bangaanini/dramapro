"use server";

import { redirect } from "next/navigation";

import { createVipPaymentSession } from "@/lib/vip-payments";

export async function createVipCheckoutAction(formData: FormData) {
  const planId = String(formData.get("planId") ?? "").trim();
  const channelCode = String(formData.get("channelCode") ?? "qris").trim();
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
    const message =
      error instanceof Error
        ? error.message
        : "Gagal membuat transaksi VIP.";
    redirect(
      `/vip/checkout?plan=${encodeURIComponent(planId)}&next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`,
    );
  }

  redirect(
    `/vip/checkout/${session.referenceId}?next=${encodeURIComponent(session.next)}`,
  );
}
