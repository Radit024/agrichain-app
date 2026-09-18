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
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(16,42,51,0.02)]",
        className,
      )}
      aria-label={title}
    >
      <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-4 flex items-stretch">{children}</div>
    </section>
  );
}

export function MetricCell({
  icon,
  value,
  label,
  tone = "neutral",
  iconTone,
  href,
}: {
  icon?: ReactNode;
  value: string | number;
  label: string;
  tone?: "brand" | "compliant" | "warning" | "danger" | "info" | "neutral" | "purple";
  iconTone?: "brand" | "compliant" | "warning" | "danger" | "info" | "neutral" | "purple";
  href?: string;
}) {
  const toneSoft: Record<string, string> = {
    brand: "bg-[#E0F2FE] text-[#0284C7]",
    purple: "bg-[#F3E8FF] text-[#9333EA]",
    compliant: "bg-[#DCFCE7] text-[#16A34A]",
    warning: "bg-[#FEF3C7] text-[#D97706]",
    danger: "bg-[#FEE2E2] text-[#DC2626]",
    info: "bg-[#E0F2FE] text-[#0284C7]",
    neutral: "bg-surface-muted text-ink-muted",
  };

  const activeIconTone = iconTone ?? (tone === "neutral" ? "brand" : tone);

  const content = (
    <>
      {icon ? (
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg shadow-xs",
            toneSoft[activeIconTone],
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="font-mono text-2xl font-bold tracking-tight text-ink tnum">{value}</p>
        <p className="text-xs font-medium text-ink-muted leading-4 mt-0.5">{label}</p>
      </div>
    </>
  );

  const base = "flex flex-1 flex-col px-4 first:pl-0 last:pr-0";

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
