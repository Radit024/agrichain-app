export default function MainAppLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse" aria-busy="true" aria-label="Memuat konten...">
      {/* Skeleton Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg bg-[#E4E7EC]" />
          <div className="h-4 w-72 rounded-md bg-[#F2F4F7]" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-[#E4E7EC]" />
      </div>

      {/* Skeleton KPI Summary Cards */}
      <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="h-4 w-36 rounded-md bg-[#E4E7EC] mb-4" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 py-2 sm:px-3">
              <div className="h-3.5 w-20 rounded bg-[#F2F4F7]" />
              <div className="h-7 w-16 rounded-md bg-[#E4E7EC]" />
              <div className="h-3 w-24 rounded bg-[#F2F4F7]" />
            </div>
          ))}
        </div>
      </section>

      {/* Skeleton Data Section / Table */}
      <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-4">
          <div className="h-4 w-40 rounded-md bg-[#E4E7EC]" />
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded-lg bg-[#F2F4F7]" />
            <div className="h-8 w-24 rounded-lg bg-[#F2F4F7]" />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between py-3 border-b border-[#F0F1F3] last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-[#F2F4F7]" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-[#E4E7EC]" />
                  <div className="h-3 w-20 rounded bg-[#F2F4F7]" />
                </div>
              </div>
              <div className="h-4 w-24 rounded bg-[#F2F4F7]" />
              <div className="h-6 w-20 rounded-full bg-[#F2F4F7]" />
              <div className="h-4 w-16 rounded bg-[#F2F4F7]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
