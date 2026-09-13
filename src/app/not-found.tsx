import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[420px] rounded-xl border border-border bg-card p-6 text-center">
        <span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-5"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <path d="M14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
          </svg>
        </span>
        <h1 className="mt-4 text-lg font-semibold text-ink">
          Batch tidak tersedia untuk ditampilkan.
        </h1>
        <p className="mt-1.5 text-sm leading-5 text-ink-muted">
          Periksa kembali QR yang dipindai atau masukkan ID publik secara manual.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
        >
          Kembali ke halaman awal
        </Link>
      </div>
    </div>
  );
}
