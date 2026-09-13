import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * MetricCard (DESIGN.md §9.3): panel judul + sel metrik sebanding dengan
 * divider vertikal; 4 sel (main 690px) / 2 sel (rail 384px). Ikon pastel,
 * nilai tabular-nums. Metrik menjawab pertanyaan keputusan, bukan mengulang
 * isi tabel.
 */
export function MetricCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-card p-5", className)}
      aria-label={title}
    >
      <h2 className="text-sm font-semibold text-ink-muted">{title}</h2>
      <div className="mt-4 flex items-stretch">{children}</div>
    </section>
  );
}

export function MetricCell({
  icon,
  value,
  label,
  tone = "brand",
  href,
}: {
  icon?: ReactNode;
  value: string | number;
  label: string;
  tone?: "brand" | "compliant" | "warning" | "danger" | "info" | "neutral";
  href?: string;
}) {
  const toneSoft: Record<string, string> = {
    brand: "bg-brand-soft text-brand",
    compliant: "bg-compliant-soft text-compliant",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
    neutral: "bg-surface-muted text-ink-muted",
  };

  const content = (
    <>
      {icon ? (
        <span
          aria-hidden
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            toneSoft[tone],
          )}
        >
          {icon}
        </span>
      ) : null}
      <p className="tnum mt-2 text-xl font-semibold leading-7 text-ink sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs leading-4 text-ink-muted">{label}</p>
    </>
  );

  const base = "flex flex-1 flex-col px-3 first:pl-0";

  if (href) {
    return (
      <a
        href={href}
        className={cn(base, "group rounded-md focus-visible:outline-2 focus-visible:outline-ring")}
      >
        <span className="group-hover:underline underline-offset-2">{content}</span>
      </a>
    );
  }
  return <div className={base}>{content}</div>;
}

/** Divider vertikal antar sel — dipisah agar terlihat di flex row. */
export function MetricDivider() {
  return <span aria-hidden className="w-px shrink-0 self-stretch bg-border" />;
}
