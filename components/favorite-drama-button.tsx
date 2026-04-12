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
};

export async function FavoriteDramaButton({
  dramaId,
  redirectTo,
  isFavorite,
  size = "sm",
  className,
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
        <Heart className="mr-2 size-4" />
        Sign in untuk favorit
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
      >
        <Heart className={`mr-2 size-4 ${isFavorite ? "fill-current" : ""}`} />
        {isFavorite ? "Tersimpan di favorit" : "Simpan ke favorit"}
      </button>
    </form>
  );
}
