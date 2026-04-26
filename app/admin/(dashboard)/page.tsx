import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { isPrismaDatabaseConnectionError } from "@/lib/prisma-errors";

export const dynamic = "force-dynamic";

export default async function AdminDashboardIndexPage() {
  try {
    const admin = await getCurrentAdmin();

    if (admin) {
      redirect("/admin/users");
    }
  } catch (error) {
    if (!isPrismaDatabaseConnectionError(error)) {
      throw error;
    }
  }

  return null;
}
