import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * StatusBadge — DESIGN.md §9.3: tiga dimensi status terpisah
 * (distribusi, kondisi, kualitas data) + hasil akses. Selalu teks+ikon,
 * warna tidak pernah satu-satunya penanda.
 */

type Tone = "neutral" | "brand" | "info" | "compliant" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-muted border-border",
  brand: "bg-brand-soft text-brand border-brand/25",
  info: "bg-info-soft text-info border-info/25",
  compliant: "bg-compliant-soft text-compliant border-compliant/25",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/25",
};

export interface StatusBadgeProps {
  tone: Tone;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold leading-4 shadow-none",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </Badge>
  );
}

/* ---------- Distribusi ---------- */

export type DistributionBadgeValue = "DIDAFTARKAN" | "DALAM_DISTRIBUSI" | "SELESAI";

const distributionMap: Record<DistributionBadgeValue, { tone: Tone; label: string }> = {
  DIDAFTARKAN: { tone: "neutral", label: "Didaftarkan" },
  DALAM_DISTRIBUSI: { tone: "brand", label: "Dalam distribusi" },
  SELESAI: { tone: "info", label: "Selesai" },
};

export function DistributionStatusBadge({ value }: { value: DistributionBadgeValue }) {
  const m = distributionMap[value];
  return (
    <StatusBadge tone={m.tone}>
      {value === "DALAM_DISTRIBUSI" ? (
        <span className="relative flex size-1.5">
          <span
            aria-hidden
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"
          />
          <span aria-hidden className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : (
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
      )}
      {m.label}
    </StatusBadge>
  );
}

/* ---------- Kondisi ---------- */

export type ConditionBadgeValue = "NOT_EVALUATED" | "COMPLIANT" | "AT_RISK";

const conditionMap: Record<ConditionBadgeValue, { tone: Tone; label: string; dot: string }> = {
  NOT_EVALUATED: { tone: "neutral", label: "Belum dievaluasi", dot: "bg-ink-muted" },
  COMPLIANT: { tone: "compliant", label: "Compliant", dot: "bg-compliant" },
  AT_RISK: { tone: "warning", label: "At risk", dot: "bg-warning" },
};

export function ConditionStatusBadge({ value }: { value: ConditionBadgeValue }) {
  const m = conditionMap[value];
  return (
    <StatusBadge tone={m.tone}>
      {value === "AT_RISK" ? (
        <span className="relative flex size-1.5">
          <span
            aria-hidden
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              m.dot,
            )}
          />
          <span aria-hidden className={cn("relative inline-flex size-1.5 rounded-full", m.dot)} />
        </span>
      ) : (
        <span aria-hidden className={cn("size-1.5 rounded-full", m.dot)} />
      )}
      {m.label}
    </StatusBadge>
  );
}

/* ---------- Kualitas data ---------- */

export type DataQualityBadgeValue = "AVAILABLE" | "DATA_UNAVAILABLE";

const dataQualityMap: Record<DataQualityBadgeValue, { tone: Tone; label: string }> = {
  AVAILABLE: { tone: "neutral", label: "Data tersedia" },
  DATA_UNAVAILABLE: { tone: "warning", label: "Data tidak tersedia" },
};

export function DataQualityStatusBadge({ value }: { value: DataQualityBadgeValue }) {
  const m = dataQualityMap[value];
  return (
    <StatusBadge tone={m.tone}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {m.label}
    </StatusBadge>
  );
}

/* ---------- Hasil akses (SAH/TIDAK SAH/ANOMALI) ---------- */

export type AccessBadgeValue = "SAH" | "TIDAK_SAH" | "ANOMALI";

const accessMap: Record<AccessBadgeValue, { tone: Tone; label: string; hint: string }> = {
  SAH: { tone: "compliant", label: "Sah", hint: "Kode, jadwal, dan lokasi sesuai" },
  TIDAK_SAH: { tone: "danger", label: "Tidak sah", hint: "Periksa kode otorisasi Anda" },
  ANOMALI: { tone: "warning", label: "Anomali", hint: "Periksa jadwal dan lokasi" },
};

export function AccessResultBadge({ value }: { value: AccessBadgeValue }) {
  const m = accessMap[value];
  return (
    <StatusBadge tone={m.tone} className="uppercase">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {m.label}
    </StatusBadge>
  );
}

export function accessHint(value: AccessBadgeValue): string {
  return accessMap[value].hint;
}

/* ---------- Sumber ---------- */

export function SourceBadge({ source = "SIMULATOR" }: { source?: string }) {
  return (
    <StatusBadge tone="info" className="font-mono tracking-wide">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {source}
    </StatusBadge>
  );
}

/* ---------- Handoff intent status ---------- */

export type HandoffIntentBadgeValue = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "FAILED";

const handoffMap: Record<HandoffIntentBadgeValue, { tone: Tone; label: string }> = {
  PENDING: { tone: "warning", label: "Menunggu penerimaan" },
  CONFIRMED: { tone: "compliant", label: "Dikonfirmasi" },
  CANCELLED: { tone: "neutral", label: "Dibatalkan" },
  EXPIRED: { tone: "neutral", label: "Kedaluwarsa" },
  FAILED: { tone: "danger", label: "Gagal sinkronisasi" },
};

export function HandoffIntentBadge({ value }: { value: HandoffIntentBadgeValue }) {
  const m = handoffMap[value];
  return (
    <StatusBadge tone={m.tone}>
      {value === "PENDING" ? (
        <span aria-hidden className="size-1.5 rounded-full bg-current ring-2 ring-current/30" />
      ) : (
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
      )}
      {m.label}
    </StatusBadge>
  );
}

/* ---------- Mode penanganan ---------- */

export function HandlingModeBadge({ mode }: { mode: "COLD_CHAIN" | "NON_COLD_CHAIN" }) {
  return (
    <StatusBadge tone={mode === "COLD_CHAIN" ? "brand" : "neutral"}>
      {mode === "COLD_CHAIN" ? "Cold chain" : "Non-cold chain"}
    </StatusBadge>
  );
}
