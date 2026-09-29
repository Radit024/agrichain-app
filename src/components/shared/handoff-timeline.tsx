import { ArrowRight, CheckCircle2, Circle, Clock, Factory, Store, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { TraceId } from "@/components/status/trace-id";

/**
 * HandoffTimeline (DESIGN.md §9.3): Pabrik → Distributor → Retailer.
 * Status "Menunggu penerimaan" tampil sebelum stage berpindah; setelah
 * konfirmasi tampil role/timestamp/lokasi tersanitasi, serta nama pengirim,
 * penerima, dan bukti transaksi on-chain ke scanner bila ada.
 */

const stageMeta = [
  { label: "Pabrik", icon: Factory },
  { label: "Distributor", icon: Truck },
  { label: "Retailer", icon: Store },
] as const;

export interface HandoffEvent {
  fromStage: number;
  toStage: number;
  confirmedAt: string;
  pointName?: string | null;
  senderName?: string | null;
  recipientName?: string | null;
  chainTxHash?: string | null;
}

export function HandoffTimeline({
  custodyStage,
  events,
  pendingToStage,
  className,
}: {
  custodyStage: number;
  events: HandoffEvent[];
  pendingToStage?: number | null;
  className?: string;
}) {
  return (
    <ol className={cn("space-y-0", className)} aria-label="Riwayat serah-terima">
      {stageMeta.map((stage, i) => {
        const confirmedEvent = events.find((e) => e.toStage === i);
        const isCurrent = custodyStage === i;
        const isPending = pendingToStage === i;
        const passed = custodyStage >= i;

        return (
          <li key={stage.label} className="relative flex gap-3 pb-6 last:pb-0">
            {/* garis penghubung vertikal */}
            {i < stageMeta.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px",
                  custodyStage > i ? "bg-brand" : "bg-border",
                )}
              />
            ) : null}

            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                confirmedEvent || (passed && i === 0)
                  ? "border-brand bg-brand text-primary-foreground shadow-2xs"
                  : isCurrent
                    ? "border-brand bg-brand-soft text-brand ring-4 ring-brand/10"
                    : isPending
                      ? "border-warning bg-warning-soft text-warning ring-4 ring-warning/20 animate-pulse"
                      : "border-border bg-card text-ink-muted",
              )}
            >
              {confirmedEvent || (passed && i === 0) ? (
                <CheckCircle2 aria-hidden className="size-4" />
              ) : isPending ? (
                <Clock aria-hidden className="size-4" />
              ) : (
                <Circle aria-hidden className="size-3.5" />
              )}
              <span className="sr-only">
                {confirmedEvent ? `${stage.label} — dikonfirmasi` : stage.label}
              </span>
            </span>

            <div className="min-w-0 pt-1">
              <p className="text-sm font-semibold text-ink">{stage.label}</p>
              {confirmedEvent ? (
                <div className="space-y-0.5 mt-0.5">
                  <p className="text-xs leading-4 text-ink-muted">
                    Diterima {formatDateTime(confirmedEvent.confirmedAt)}
                    {confirmedEvent.pointName ? ` — ${confirmedEvent.pointName}` : ""}
                  </p>
                  {confirmedEvent.senderName || confirmedEvent.recipientName ? (
                    <p className="text-[11px] leading-4 text-ink-muted">
                      {confirmedEvent.senderName ? `Pengirim: ${confirmedEvent.senderName}` : ""}
                      {confirmedEvent.senderName && confirmedEvent.recipientName ? " • " : ""}
                      {confirmedEvent.recipientName
                        ? `Penerima: ${confirmedEvent.recipientName}`
                        : ""}
                    </p>
                  ) : null}
                  {confirmedEvent.chainTxHash ? (
                    <div className="pt-0.5 flex items-center gap-1.5">
                      <span className="text-[11px] text-ink-muted">Tx:</span>
                      <TraceId
                        value={confirmedEvent.chainTxHash}
                        isTx={true}
                        label="Tx Serah-terima"
                      />
                    </div>
                  ) : null}
                </div>
              ) : isCurrent ? (
                <p className="mt-0.5 text-xs leading-4 text-ink-muted">Kustodian saat ini</p>
              ) : isPending ? (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium leading-4 text-warning">
                  <Clock aria-hidden className="size-3" />
                  Menunggu penerimaan
                </p>
              ) : (
                <p className="mt-0.5 text-xs leading-4 text-ink-muted">Belum tercatat</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Ringkas horizontal — dipakai di kartu mobile & publik. */
export function HandoffStageRow({
  custodyStage,
  pendingToStage,
}: {
  custodyStage: number;
  pendingToStage?: number | null;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-muted" aria-hidden>
      {stageMeta.map((s, i) => (
        <span key={s.label} className="flex items-center gap-1.5">
          {i > 0 ? <ArrowRight className="size-3" /> : null}
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 font-medium",
              custodyStage === i
                ? "bg-brand-soft text-brand"
                : custodyStage > i || (i === 0 && custodyStage >= 0)
                  ? "bg-compliant-soft text-compliant"
                  : pendingToStage === i
                    ? "bg-warning-soft text-warning"
                    : "bg-surface-muted",
            )}
          >
            {s.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatPPMDisplay(ppm: string | number | null): string {
  if (ppm === null || ppm === undefined) return "–";
  const n = typeof ppm === "string" ? Number(ppm) : ppm;
  if (!Number.isFinite(n)) return "–";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n / 1_000_000);
}
