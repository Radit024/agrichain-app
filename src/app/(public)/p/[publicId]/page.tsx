import type { Metadata } from "next";

export const metadata: Metadata = { title: "Riwayat Batch" };

/** Halaman QR publik (read-only, tanpa shell internal) — dibangun penuh di Fase J. */
export default async function PublicBatchPage({ params }: PageProps<"/p/[publicId]">) {
  const { publicId } = await params;
  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="text-center space-y-1">
          <p className="text-xs font-mono text-ink-muted">{publicId}</p>
          <h1 className="text-xl font-semibold text-ink">Riwayat Batch</h1>
        </header>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-ink-muted">
          <p>Memuat riwayat batch…</p>
          <p className="mt-4 text-xs leading-relaxed">
            Status menunjukkan evaluasi atas data kondisi yang tercatat (sumber SIMULATOR), bukan
            sertifikasi keamanan pangan fisik.
          </p>
        </div>
      </div>
    </main>
  );
}
