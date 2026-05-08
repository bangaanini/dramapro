import Link from "next/link";
import { Heart } from "lucide-react";

import { toggleFavoriteDramaAction } from "@/app/drama/actions";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/user-auth";

type FavoriteDramaButtonProps = {
  dramaId: string;
  redirectTo: string;
  isFavorite: boolean;
  size?: ButtonProps["size"];
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
};

export async function FavoriteDramaButton({
  dramaId,
  redirectTo,
  isFavorite,
  size = "sm",
  className,
  compact = false,
  iconOnly = false,
}: FavoriteDramaButtonProps) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(redirectTo)}`}
        className={cn(
          buttonVariants({ variant: "secondary", size }),
          className,
        )}
      >
        <Heart
          className={
            iconOnly
              ? "size-5"
              : compact
                ? "size-4 sm:mr-2"
                : "mr-2 size-4"
          }
        />
        <span
          className={
            iconOnly ? "sr-only" : compact ? "sr-only sm:not-sr-only" : undefined
          }
        >
          Sign in untuk favorit
        </span>
      </Link>
    );
  }

  return (
    <form action={toggleFavoriteDramaAction}>
      <input type="hidden" name="dramaId" value={dramaId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button
        type="submit"
        className={cn(
          buttonVariants({
            variant: isFavorite ? "default" : "secondary",
            size,
          }),
          className,
        )}
        aria-label={isFavorite ? "Hapus dari favorit" : "Simpan ke favorit"}
      >
        <Heart
          className={`${
            iconOnly ? "size-5" : compact ? "size-4 sm:mr-2" : "mr-2 size-4"
          } ${
            isFavorite ? "fill-current" : ""
          }`}
        />
        <span
          className={
            iconOnly ? "sr-only" : compact ? "sr-only sm:not-sr-only" : undefined
          }
        >
          {isFavorite ? "Tersimpan di favorit" : "Simpan ke favorit"}
        </span>
      </button>
    </form>
  );
}
