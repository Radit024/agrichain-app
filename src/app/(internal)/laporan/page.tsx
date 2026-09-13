import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { getReportMetrics } from "@/server/queries/internal";
import { MetricCard, MetricCell, MetricDivider } from "@/components/shared/metric-card";
import { ConditionTrendChart } from "@/components/shared/trend-charts";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatePanel } from "@/components/shared/state-panel";
import { SourceBadge } from "@/components/status/status-badges";
import { TraceId } from "@/components/status/trace-id";
import { formatDateTime } from "@/components/shared/handoff-timeline";

export const metadata: Metadata = { title: "Laporan dan Audit" };
export const dynamic = "force-dynamic";

const eventTypeLabels: Record<string, string> = {
  BATCH_REGISTERED: "Pendaftaran batch",
  HANDOFF_INITIATED: "Inisiasi serah-terima",
  HANDOFF_CONFIRMED: "Konfirmasi serah-terima",
  HANDOFF_CANCELLED: "Pembatalan serah-terima",
  CONDITION: "Evaluasi kondisi",
  VALID_ACCESS: "Akses sah",
  DIGEST: "Digest periodik",
};

export default async function ReportsPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();
  const m = await getReportMetrics(db, session);

  const columns: Column<(typeof m.evidence)[number]>[] = [
    {
      key: "batch",
      header: "Batch",
      cell: (r) => (
        <span className="font-mono text-sm font-semibold text-ink">{r.batchCode ?? "—"}</span>
      ),
    },
    {
      key: "event",
      header: "Peristiwa",
      cell: (r) => (
        <span className="text-sm text-ink">{eventTypeLabels[r.eventType] ?? r.eventType}</span>
      ),
    },
    {
      key: "time",
      header: "Waktu",
      cell: (r) => <span className="text-xs text-ink-muted">{formatDateTime(r.eventTime)}</span>,
    },
    {
      key: "tx",
      header: "Referensi transaksi",
      cell: (r) =>
        r.txHash ? (
          <TraceId value={r.txHash} label="Hash transaksi" />
        ) : (
          <span className="text-xs text-ink-muted">
            {r.syncStatus === "PENDING" ? "Menunggu konfirmasi" : "Belum terkirim"}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold leading-8 text-ink">Laporan dan Audit</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Laporan kepatuhan dan bukti peristiwa per 14 hari terakhir. Seluruh data kondisi berasal
          dari <span className="font-medium text-info">SIMULATOR</span>.
        </p>
      </header>

      {/* Dua kartu ringkasan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MetricCard title="Batch Terpantau">
          <MetricCell value={m.monitoredBatches} label="Total batch organisasi" />
          <MetricDivider />
          <MetricCell
            value={`${m.complianceRate}%`}
            label="Compliant (data tercatat)"
            tone="compliant"
          />
        </MetricCard>
        <MetricCard title="Hasil Verifikasi Akses">
          <MetricCell
            icon={<ShieldCheck aria-hidden className="size-4" />}
            value={m.verificationOutcomes.find((o) => o.outcome === "SAH")?.count ?? 0}
            label="Sah"
            tone="compliant"
          />
          <MetricDivider />
          <MetricCell
            value={
              (m.verificationOutcomes.find((o) => o.outcome === "TIDAK_SAH")?.count ?? 0) +
              (m.verificationOutcomes.find((o) => o.outcome === "ANOMALI")?.count ?? 0)
            }
            label="Tidak sah + anomali"
            tone="warning"
          />
        </MetricCard>
      </div>

      {/* Chart tren */}
      <section className="rounded-xl border border-border bg-card p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Tren Kepatuhan Kondisi</h2>
          <SourceBadge />
        </header>
        <p className="mt-1 text-xs text-ink-muted">
          Evaluasi terhadap data kondisi tercatat — tidak menyatakan keamanan pangan fisik.
        </p>
        <ConditionTrendChart data={m.trend} />
      </section>

      {/* Tabel bukti */}
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Bukti Batch / Peristiwa</h2>
        </header>
        {m.evidence.length === 0 ? (
          <StatePanel
            state="empty"
            title="Belum ada bukti peristiwa."
            description="Bukti muncul setelah operasi pendaftaran, serah-terima, evaluasi, dan verifikasi terekam."
            className="border-0"
          />
        ) : (
          <DataTable
            columns={columns}
            rows={m.evidence}
            getRowKey={(r) => r.id}
            mobileCards={(r) => (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-sm font-semibold text-ink">{r.batchCode ?? "—"}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {eventTypeLabels[r.eventType] ?? r.eventType} · {formatDateTime(r.eventTime)}
                </p>
                {r.txHash ? (
                  <p className="mt-2 truncate font-mono text-xs text-ink-muted">{r.txHash}</p>
                ) : null}
              </div>
            )}
          />
        )}
      </section>
    </div>
  );
}
