import Link from "next/link";
import { Clapperboard } from "lucide-react";

type SiteHeaderProps = {
  current?: "home" | "library" | "account" | "watch";
};

export async function SiteHeader({ current }: SiteHeaderProps) {
  void current;

  return (
    <header className="sticky top-0 z-50 pb-4 pt-3 sm:pt-4">
      <div className="soft-panel rounded-[1.8rem] px-4 py-3.5 sm:px-5">
        <div className="flex items-center justify-center">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex size-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent-soft text-accent shadow-[0_14px_30px_rgba(255,122,69,0.18)] transition group-hover:scale-[1.03]">
              <span className="absolute inset-1 rounded-[1.05rem] bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_70%)]" />
              <Clapperboard className="size-5" />
            </div>
            <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              DramaPro
            </p>
          </Link>
        </div>
      </div>
    </header>
  );
}
