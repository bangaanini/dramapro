import { redirect } from "next/navigation";

import { createVipPaymentSession, requireSignedInVipUser } from "@/lib/vip-payments";
import { resolveSafeRedirectPath } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

export default async function VipCheckoutPage(
  props: PageProps<"/vip/checkout">,
) {
  const searchParams = await props.searchParams;
  const planId =
    typeof searchParams.plan === "string" ? searchParams.plan : null;
  const next = resolveSafeRedirectPath(
    typeof searchParams.next === "string" ? searchParams.next : "/vip",
  );

  await requireSignedInVipUser(`/vip/checkout?plan=${planId ?? ""}&next=${encodeURIComponent(next)}`);

  if (!planId) {
    redirect(`/vip?next=${encodeURIComponent(next)}`);
  }

  try {
    const session = await createVipPaymentSession({
      planId,
      channelCode: "qris",
      next,
    });

    redirect(
      `/vip/checkout/${session.referenceId}?next=${encodeURIComponent(session.next)}`,
    );
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Gagal menyiapkan checkout VIP.";
    redirect(`/vip?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`);
  }
}
