import Link from "next/link";
import { Heart, LibraryBig, LogOut, LogIn, UserPlus } from "lucide-react";

import { logoutUserAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/user-auth";

export async function UserSessionNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/sign-in"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <LogIn className="mr-2 size-4" />
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <UserPlus className="mr-2 size-4" />
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Badge className="border-accent/25 bg-accent-soft px-3 py-1.5 text-white">
        {user.name}
      </Badge>
      <Link
        href="/profile"
        className={buttonVariants({ variant: "secondary", size: "sm" })}
      >
        <LibraryBig className="mr-2 size-4" />
        Profil
      </Link>
      <form action={logoutUserAction}>
        <button
          type="submit"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <LogOut className="mr-2 size-4" />
          Logout
        </button>
      </form>
    </div>
  );
}

export async function UserLibraryHint() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <Badge className="border-white/10 bg-black/45 text-white backdrop-blur">
        <Heart className="mr-1.5 size-3.5 text-accent" />
        Favorit dan history siap untuk akunmu
      </Badge>
    );
  }

  return (
      <Link
      href="/sign-up?next=/profile"
      className={buttonVariants({ variant: "secondary", size: "sm" })}
    >
      <Heart className="mr-2 size-4" />
      Simpan favorit dengan akun
    </Link>
  );
}
