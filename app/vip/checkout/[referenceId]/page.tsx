import { redirect } from "next/navigation";
import { resolveSafeRedirectPath } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function VipCheckoutDetailPage(
  props: PageProps<"/vip/checkout/[referenceId]">,
) {
  const { referenceId } = await props.params;
  const searchParams = await props.searchParams;
  const next = resolveSafeRedirectPath(
    typeof searchParams.next === "string" ? searchParams.next : "/vip",
  );
  redirect(`/vip?checkout=${encodeURIComponent(referenceId)}&next=${encodeURIComponent(next)}`);
}
