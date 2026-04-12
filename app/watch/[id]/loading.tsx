export default function WatchDetailLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
        <div className="glass-panel overflow-hidden rounded-[2.2rem] border border-white/10">
          <div className="aspect-[9/14] animate-pulse bg-[linear-gradient(180deg,rgba(56,36,31,0.96),rgba(20,13,13,0.98))]" />
        </div>

        <div className="space-y-5">
          <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
            <div className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
              <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-white/10" />
              <div className="h-20 w-full animate-pulse rounded-[1.4rem] bg-white/8" />
              <div className="flex gap-3">
                <div className="h-12 flex-1 animate-pulse rounded-full bg-white/10" />
                <div className="h-12 w-40 animate-pulse rounded-full bg-white/10" />
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
            <div className="mb-5 h-8 w-40 animate-pulse rounded-xl bg-white/10" />
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {Array.from({ length: 15 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[4.5rem] animate-pulse rounded-[1.3rem] bg-white/8"
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
