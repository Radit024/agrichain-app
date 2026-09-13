import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Lock, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * StatePanel — DESIGN.md "Required states": loading (skeleton match
 * geometry), empty, no-access, error, rate-limited. Copy persis tabel
 * Required states DESIGN.md (id-ID).
 */

export function StatePanel({
  state,
  title,
  description,
  action,
  className,
}: {
  state: "loading" | "empty" | "no-access" | "error" | "rate-limited";
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const copy = defaultCopy[state];
  return (
    <div
      role={state === "error" || state === "no-access" ? "alert" : undefined}
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-10 text-center",
        className,
      )}
    >
      <StateIcon state={state} />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">{title ?? copy.title}</p>
        <p className="mx-auto max-w-sm text-sm leading-5 text-ink-muted">
          {description ?? copy.description}
        </p>
      </div>
      {action ?? copy.action}
    </div>
  );
}

const defaultCopy: Record<string, { title: string; description: string; action?: ReactNode }> = {
  empty: {
    title: "Belum ada data yang sesuai filter.",
    description: "Coba ubah filter atau tambahkan data baru untuk memulai.",
  },
  "no-access": {
    title: "Akun ini belum memiliki akses ke data tersebut.",
    description: "Hubungi administrator organisasi Anda bila seharusnya ada akses.",
  },
  error: {
    title: "Data belum dapat dimuat. Coba lagi.",
    description: "Terjadi gangguan pada layanan. Tindakan Anda belum tercatat.",
  },
  "rate-limited": {
    title: "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.",
    description: "Batas percobaan sementara diterapkan untuk menjaga keamanan.",
  },
};

function StateIcon({ state }: { state: string }) {
  const cls = "size-8 text-ink-muted";
  switch (state) {
    case "empty":
      return <Inbox aria-hidden className={cls} />;
    case "no-access":
      return <Lock aria-hidden className={cls} />;
    case "error":
      return <AlertTriangle aria-hidden className={cls} />;
    case "rate-limited":
      return <RefreshCw aria-hidden className={cls} />;
    default:
      return <SearchX aria-hidden className={cls} />;
  }
}

/** Skeleton tabel — cocokkan geometri DataTable. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Memuat data…" role="status">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="hidden h-4 w-1/6 sm:block" />
          <Skeleton className="hidden h-4 w-1/6 md:block" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton kartu metrik — geometri MetricCard. */
export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5" aria-hidden>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-7 w-16" />
    </div>
  );
}

/** Retry button reusable. */
export function RetryButton({
  onClick,
  label = "Coba lagi",
}: {
  onClick?: () => void;
  label?: string;
}) {
  return (
    <Button onClick={onClick} size="sm" variant="outline" type="button">
      <RefreshCw aria-hidden className="size-3.5" />
      {label}
    </Button>
  );
}
