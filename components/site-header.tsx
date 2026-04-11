import Link from "next/link";
import { Clapperboard } from "lucide-react";

type SiteHeaderProps = {
  current?: "home" | "library" | "account" | "watch";
};

export function SiteHeader({ current }: SiteHeaderProps) {
  void current;

  return (
    <header className="sticky top-0 z-50">
      <div className="soft-panel rounded-none border-x-0 border-t-0 px-3 py-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-start">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex size-10 items-center justify-center rounded-2xl border border-accent/20 bg-accent-soft text-accent shadow-[0_14px_30px_rgba(255,122,69,0.18)] transition group-hover:scale-[1.03]">
              <span className="absolute inset-1 rounded-[1rem] bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_70%)]" />
              <Clapperboard className="size-4.5" />
            </div>
            <p className="text-base font-semibold tracking-tight text-white sm:text-lg">
              DramaPro
            </p>
          </Link>
        </div>
      </div>
    </header>
  );
}
