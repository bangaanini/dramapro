import { Clapperboard } from "lucide-react";

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="soft-panel rounded-[1.8rem] px-4 py-3.5 sm:px-5">
        <div className="flex items-center justify-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent-soft text-accent shadow-[0_14px_30px_rgba(255,122,69,0.18)]">
            <Clapperboard className="size-5" />
          </div>
          <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            DramaPro
          </p>
        </div>
      </div>

      <section className="soft-panel mt-6 overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8">
        <div className="space-y-4">
          <div className="skeleton h-6 w-32 rounded-full" />
          <div className="skeleton h-12 w-full max-w-2xl rounded-2xl" />
          <div className="skeleton h-5 w-full max-w-xl rounded-xl" />
        </div>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="soft-panel overflow-hidden rounded-[1.6rem] p-0"
          >
            <div className="skeleton aspect-[3/4] w-full" />
            <div className="space-y-3 p-4">
              <div className="skeleton h-4 w-20 rounded-full" />
              <div className="skeleton h-4 w-full rounded-full" />
              <div className="skeleton h-4 w-3/4 rounded-full" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
