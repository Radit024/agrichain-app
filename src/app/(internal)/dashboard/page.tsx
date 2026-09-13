import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AlertTriangle, ClipboardCheck, ShieldCheck, Boxes, Activity } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDashboardMetrics } from "@/server/queries/internal";
import { getDbAdapter } from "@/server/db/adapter";
import { MetricCard, MetricCell, MetricDivider } from "@/components/shared/metric-card";
import {
  ConditionStatusBadge,
  DataQualityStatusBadge,
  DistributionStatusBadge,
  SourceBadge,
} from "@/components/status/status-badges";
import { ConditionTrendChart, HandoffTrendChart } from "@/components/shared/trend-charts";
import { StatePanel } from "@/components/shared/state-panel";
import { formatDateTime } from "@/components/shared/handoff-timeline";

export const metadata: Metadata = { title: "Ringkasan Operasional" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();
  const m = await getDashboardMetrics(db, session);

  const hasAny =
    m.activeBatches > 0 || m.attentionBatches.length > 0 || m.conditionTrend.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold leading-8 text-ink">Ringkasan Operasional</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Status menunjukkan evaluasi atas data kondisi yang tercatat.
        </p>
      </header>

      {/* Band 1: dua baris kartu ringkasan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[690px_1fr] xl:grid-cols-[690px_384px]">
        <div className="space-y-6">
          <MetricCard title="Ringkasan Distribusi" className="min-h-[163px]">
            <MetricCell
              icon={<Boxes aria-hidden className="size-4" />}
              value={m.activeBatches}
              label="Batch aktif"
              href="/batch"
            />
            <MetricDivider />
            <MetricCell
              icon={<ClipboardCheck aria-hidden className="size-4" />}
              value={m.awaitingReception}
              label="Menunggu penerimaan"
              tone="warning"
              href="/serah-terima"
            />
            <MetricDivider />
            <MetricCell
              icon={<ShieldCheck aria-hidden className="size-4" />}
              value={m.compliant}
              label="Compliant"
              tone="compliant"
            />
            <MetricDivider />
            <MetricCell
              icon={<AlertTriangle aria-hidden className="size-4" />}
              value={m.atRisk}
              label="At risk"
              tone="warning"
            />
          </MetricCard>
        </div>

        <div className="space-y-6">
          <MetricCard title="Ringkasan Verifikasi (7 hari)">
            <MetricCell
              icon={<ShieldCheck aria-hidden className="size-4" />}
              value={m.sahAttempts}
              label="Sah"
              tone="compliant"
            />
            <MetricDivider />
            <MetricCell value={m.tidakSahAttempts} label="Tidak sah" tone="danger" />
          </MetricCard>
          <MetricCard title="Ringkasan Batch">
            <MetricCell
              icon={<Activity aria-hidden className="size-4" />}
              value={m.inDistribution}
              label="Dalam distribusi"
            />
            <MetricDivider />
            <MetricCell value={m.anomaliAttempts} label="Anomali" tone="warning" />
          </MetricCard>
        </div>
      </div>

      {/* Band 2: tren bukti */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[690px_1fr] xl:grid-cols-[690px_384px]">
        <section className="rounded-xl border border-border bg-card p-5">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Tren Kepatuhan Kondisi</h2>
            <SourceBadge />
          </header>
          <p className="mt-1 text-xs text-ink-muted">
            Evaluasi terhadap data kondisi tercatat, bukan bukti kondisi fisik.
          </p>
          <ConditionTrendChart data={m.conditionTrend} />
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Status Serah-terima</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Dicatat (initiasi pengirim) vs Dikonfirmasi (penerima).
          </p>
          <HandoffTrendChart data={m.handoffTrend} />
        </section>
      </div>

      {/* Band 3: tabel perlu ditindaklanjuti + peringatan kondisi */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[690px_1fr] xl:grid-cols-[690px_384px]">
        <section className="rounded-xl border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Batch yang Perlu Ditindaklanjuti</h2>
            <Link
              href="/batch"
              className="text-xs font-medium text-brand underline-offset-2 hover:underline"
            >
              Lihat semua
            </Link>
          </header>
          {m.attentionBatches.length === 0 ? (
            <StatePanel
              state="empty"
              title="Belum ada batch yang memerlukan tindakan."
              description="Batch akan muncul di sini saat berstatus at risk, data tidak tersedia, atau menunggu penerimaan."
              className="border-0"
            />
          ) : (
            <ul className="divide-y divide-border">
              {m.attentionBatches.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/batch/${b.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-surface-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-sm font-semibold text-ink">
                        {b.batchCode}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {b.productName || "Tanpa kategori"}
                      </span>
                    </span>
                    <span className="ml-auto flex flex-wrap items-center gap-1.5">
                      <DistributionStatusBadge
                        value={
                          b.distributionStatus as "DIDAFTARKAN" | "DALAM_DISTRIBUSI" | "SELESAI"
                        }
                      />
                      <ConditionStatusBadge
                        value={b.conditionStatus as "NOT_EVALUATED" | "COMPLIANT" | "AT_RISK"}
                      />
                      {b.dataQualityStatus === "DATA_UNAVAILABLE" ? (
                        <DataQualityStatusBadge value="DATA_UNAVAILABLE" />
                      ) : null}
                    </span>
                    <span className="w-full text-xs text-ink-muted sm:w-auto">
                      {formatDateTime(b.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Peringatan Kondisi Tercatat</h2>
          </header>
          {m.conditionAlerts.length === 0 ? (
            <StatePanel
              state="empty"
              title="Tidak ada peringatan kondisi."
              description="Peringatan muncul saat evaluasi menghasilkan at risk atau data tidak tersedia."
              className="border-0"
            />
          ) : (
            <ul className="divide-y divide-border">
              {m.conditionAlerts.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 px-5 py-3.5">
                  <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-ink">{a.batchCode}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-muted">
                      {a.reason}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">{formatDateTime(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {!hasAny ? (
        <StatePanel
          state="empty"
          title="Belum ada batch yang sesuai filter."
          description="Daftarkan batch pertama Anda dari halaman Batch untuk memulai."
          action={
            <Link
              href="/batch"
              className="text-sm font-medium text-brand underline-offset-2 hover:underline"
            >
              Buka halaman Batch
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
