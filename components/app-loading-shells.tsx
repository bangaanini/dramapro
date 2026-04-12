import { cn } from "@/lib/utils";

function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}

export function CatalogPageLoadingShell() {
  return (
    <main className="route-transition-shell mx-auto min-h-screen w-full max-w-none px-0 py-0">
      <div className="sticky top-0 z-40 border-b border-white/8 bg-[linear-gradient(180deg,rgba(18,12,12,0.98),rgba(18,12,12,0.88))] px-3 py-3 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <SkeletonBlock className="h-11 w-36 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <section className="mx-auto w-full max-w-none px-0 pb-24">
        <div className="sticky top-[3.95rem] z-30 border-b border-white/7 bg-[linear-gradient(180deg,rgba(15,10,10,0.98),rgba(15,10,10,0.9))] px-3 pb-2 pt-2 backdrop-blur-2xl">
          <div className="px-1 pb-1">
            <SkeletonBlock className="h-3 w-20 rounded-full" />
            <SkeletonBlock className="mt-2 h-7 w-48 rounded-2xl" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-10 rounded-full" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 px-2 pt-3 sm:grid-cols-4 sm:px-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(34,22,20,0.96),rgba(14,10,10,0.98))]"
            >
              <SkeletonBlock className="aspect-[0.74] rounded-none" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ProfilePageLoadingShell() {
  return (
    <main className="route-transition-shell mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <div className="glass-panel rounded-[2rem] p-5">
          <div className="flex items-center gap-4">
            <SkeletonBlock className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-6 w-40" />
              <SkeletonBlock className="h-4 w-28" />
            </div>
          </div>
          <SkeletonBlock className="mt-5 h-28 w-full rounded-[1.6rem]" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="glass-panel rounded-[1.5rem] p-4">
            <SkeletonBlock className="h-16 w-full rounded-[1.1rem]" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function AffiliatePageLoadingShell() {
  return (
    <main className="route-transition-shell mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 pb-28 pt-4 sm:px-5 sm:pt-6">
      <div className="space-y-4">
        <div className="glass-panel rounded-[2rem] p-5">
          <SkeletonBlock className="h-4 w-28 rounded-full" />
          <SkeletonBlock className="mt-3 h-8 w-52" />
          <SkeletonBlock className="mt-3 h-20 w-full rounded-[1.4rem]" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SkeletonBlock className="h-32 w-full rounded-[1.4rem]" />
            <SkeletonBlock className="h-32 w-full rounded-[1.4rem]" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="glass-panel rounded-[1.7rem] p-5">
            <SkeletonBlock className="h-28 w-full rounded-[1.2rem]" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function VipPageLoadingShell() {
  return (
    <main className="route-transition-shell mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="glass-panel rounded-[2.4rem] p-8">
        <SkeletonBlock className="mx-auto h-6 w-40 rounded-full" />
        <SkeletonBlock className="mx-auto mt-6 h-14 w-80 max-w-full rounded-[1.8rem]" />
        <SkeletonBlock className="mx-auto mt-4 h-6 w-64 max-w-full rounded-full" />
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="glass-panel rounded-[2rem] p-6">
            <SkeletonBlock className="h-4 w-24 rounded-full" />
            <SkeletonBlock className="mt-5 h-12 w-36 rounded-2xl" />
            <SkeletonBlock className="mt-6 h-32 w-full rounded-[1.4rem]" />
            <SkeletonBlock className="mt-6 h-12 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function PlayerPageLoadingShell() {
  return (
    <main className="route-transition-shell min-h-screen bg-black">
      <div className="mx-auto w-full max-w-[440px]">
        <div className="aspect-[9/16] min-h-screen w-full bg-black">
          <SkeletonBlock className="h-full w-full rounded-none" />
        </div>
      </div>
    </main>
  );
}
