"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";

export async function toggleFavoriteDramaAction(formData: FormData) {
  const dramaId = String(formData.get("dramaId") ?? "").trim();
  const redirectTo = resolveSafeRedirectPath(
    String(formData.get("redirectTo") ?? "/library?tab=collection"),
  );

  if (!dramaId) {
    redirect(redirectTo);
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(redirectTo)}`);
  }

  const existingFavorite = await prisma.favoriteDrama.findUnique({
    where: {
      userId_seriesId: {
        userId: user.id,
        seriesId: dramaId,
      },
    },
    select: { id: true },
  });

  if (existingFavorite) {
    await prisma.favoriteDrama.delete({
      where: { id: existingFavorite.id },
    });
  } else {
    await prisma.favoriteDrama.create({
      data: {
        userId: user.id,
        seriesId: dramaId,
      },
    });
  }

  revalidatePath("/library");
  revalidatePath(redirectTo);
  redirect(redirectTo);
}
