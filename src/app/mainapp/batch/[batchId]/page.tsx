import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QrCode as QrIcon, ArrowLeft } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { getBatchDetail } from "@/server/queries/internal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ConditionStatusBadge,
  DataQualityStatusBadge,
  DistributionStatusBadge,
  HandlingModeBadge,
  SourceBadge,
} from "@/components/status/status-badges";
import { TraceId } from "@/components/status/trace-id";
import {
  HandoffTimeline,
  formatDateTime,
  formatPPMDisplay,
} from "@/components/shared/handoff-timeline";
import { ComplianceCard, parameterLabel } from "@/components/shared/compliance-card";
import { StatePanel } from "@/components/shared/state-panel";
import { QrDownloadButton } from "@/components/batch/qr-download-button";
import { BatchTelemetryChart } from "@/components/shared/trend-charts";
import { StaggerContainer, StaggerItem, MotionCard } from "@/components/motion/motion-container";

export const metadata: Metadata = { title: "Detail Batch" };
export const dynamic = "force-dynamic";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();
  const batch = await getBatchDetail(db, session, batchId);
  if (!batch) notFound();

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <Link
          href="/mainapp/batch"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Kembali ke daftar batch
        </Link>
      </StaggerItem>

      {/* Header: identitas + QR + 3 status + update terakhir */}
      <StaggerItem>
        <MotionCard hoverLift={false} className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-mono text-xl font-semibold text-ink">{batch.batchCode}</h1>
                <HandlingModeBadge mode={batch.handlingMode} />
              </div>
              <p className="mt-1 text-sm text-ink-muted">{batch.categoryName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-muted">ID publik:</span>
                <TraceId value={batch.publicId} label="ID publik" />
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Didaftarkan {formatDateTime(batch.createdAt)} · diperbarui{" "}
                {formatDateTime(batch.updatedAt)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <QrDownloadButton publicId={batch.publicId} batchCode={batch.batchCode} />
              <Link
                href={`/p/${batch.publicId}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand underline-offset-2 hover:underline"
              >
                <QrIcon aria-hidden className="size-3.5" />
                Lihat halaman publik
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <DistributionStatusBadge
              value={batch.distributionStatus as "DIDAFTARKAN" | "DALAM_DISTRIBUSI" | "SELESAI"}
            />
            <ConditionStatusBadge
              value={batch.conditionStatus as "NOT_EVALUATED" | "COMPLIANT" | "AT_RISK"}
            />
            <DataQualityStatusBadge
              value={batch.dataQualityStatus as "AVAILABLE" | "DATA_UNAVAILABLE"}
            />
            {batch.paused ? (
              <span className="inline-flex items-center rounded-md border border-danger/25 bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
                Pencatatan ditunda
              </span>
            ) : null}
          </div>
        </MotionCard>
      </StaggerItem>

      <StaggerItem>
        <Tabs defaultValue="ringkasan">
          <TabsList>
            <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
            <TabsTrigger value="kondisi">Kondisi</TabsTrigger>
            <TabsTrigger value="serah-terima">Serah-terima</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="ringkasan" className="mt-4">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Identitas & profil</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <Row label="Kategori">{batch.categoryName}</Row>
                    <Row label="Mode penanganan">
                      {batch.handlingMode === "COLD_CHAIN" ? "Cold chain" : "Non-cold chain"}
                    </Row>
                    <Row label="Versi profil (snapshot)">
                      {batch.profileSnapshot?.version ?? "–"}
                    </Row>
                    <Row label="Batas bacaan stale">
                      {batch.profileSnapshot?.staleAfterSeconds
                        ? `${Math.round(batch.profileSnapshot.staleAfterSeconds / 60)} menit`
                        : "–"}
                    </Row>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sinkronisasi catatan audit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <Row label="Status tulis on-chain">
                      {batch.chainSyncStatus === "CONFIRMED"
                        ? "Dikonfirmasi"
                        : batch.chainSyncStatus === "PENDING"
                          ? "Menunggu konfirmasi"
                          : "Gagal — menunggu rekonsiliasi"}
                    </Row>
                    {batch.chainTxHash ? (
                      <Row label="Tx terakhir">
                        <TraceId value={batch.chainTxHash} label="Hash transaksi" />
                      </Row>
                    ) : null}
                    <p className="text-xs leading-4 text-ink-muted">
                      Riwayat batch tetap dapat dibaca meski transaksi belum dikonfirmasi.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Serah-terima (ringkas)</CardTitle>
                </CardHeader>
                <CardContent>
                  <HandoffTimeline
                    custodyStage={batch.custodyStage}
                    events={batch.handoffs}
                    pendingToStage={batch.pendingIntent?.toStage ?? null}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="kondisi" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ComplianceCard
                rules={batch.profileSnapshot?.rules ?? []}
                reading={batch.latestReading}
                evaluation={batch.latestEvaluation}
              />
              {batch.latestEvaluation ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Evaluasi terakhir</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <Row label="Status kondisi">
                      <ConditionStatusBadge
                        value={
                          batch.latestEvaluation.conditionStatus as
                            "NOT_EVALUATED" | "COMPLIANT" | "AT_RISK"
                        }
                      />
                    </Row>
                    <Row label="Kualitas data">
                      <DataQualityStatusBadge
                        value={
                          batch.latestEvaluation.dataQualityStatus as
                            "AVAILABLE" | "DATA_UNAVAILABLE"
                        }
                      />
                    </Row>
                    <Row label="Waktu evaluasi">
                      {formatDateTime(batch.latestEvaluation.evaluatedAt)}
                    </Row>
                    <div>
                      <p className="text-xs font-medium text-ink-muted">Alasan</p>
                      <ul className="mt-1 list-inside list-disc text-sm text-ink">
                        {batch.latestEvaluation.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                    {batch.latestEvaluation.alerts && batch.latestEvaluation.alerts.length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-amber-600">Peringatan Operasional</p>
                        <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                          {batch.latestEvaluation.alerts.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : (
                <StatePanel
                  state="empty"
                  title="Belum ada evaluasi tercatat."
                  description="Evaluasi muncul setelah data kondisi dari sumber SIMULATOR diproses."
                />
              )}
            </div>

            {/* Grafik Tren Telemetri Sensor */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm">Tren Telemetri Sensor</CardTitle>
                  <p className="text-xs text-ink-muted">
                    Fluktuasi suhu (°C) dan kelembapan (%) sepanjang pemantauan distribusi
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                    <span className="size-2 rounded-full bg-[#EF4444]" />
                    Suhu (°C)
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                    <span className="size-2 rounded-full bg-[#06B6D4]" />
                    Kelembapan (%)
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <BatchTelemetryChart readings={batch.recentReadings} />
              </CardContent>
            </Card>

            {/* Riwayat Evaluasi Kondisi */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm">Riwayat Evaluasi Kondisi</CardTitle>
                  <p className="text-xs text-ink-muted">
                    Catatan riwayat evaluasi kepatuhan parameter batch terhadap profil monitoring
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {batch.evaluationHistory && batch.evaluationHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-ink">
                      <thead className="border-b border-border text-ink-muted">
                        <tr>
                          <th className="py-2.5 pr-4 font-normal">Waktu Evaluasi</th>
                          <th className="py-2.5 px-4 font-normal">Status Kondisi</th>
                          <th className="py-2.5 px-4 font-normal">Kualitas Data</th>
                          <th className="py-2.5 pl-4 font-normal">Alasan & Peringatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {batch.evaluationHistory.map((eh) => (
                          <tr key={eh.id} className="hover:bg-surface-muted/50">
                            <td className="py-3 pr-4 font-mono tnum text-ink-muted whitespace-nowrap">
                              {formatDateTime(eh.evaluatedAt)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <ConditionStatusBadge
                                value={
                                  eh.conditionStatus as "NOT_EVALUATED" | "COMPLIANT" | "AT_RISK"
                                }
                              />
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <DataQualityStatusBadge
                                value={eh.dataQualityStatus as "AVAILABLE" | "DATA_UNAVAILABLE"}
                              />
                            </td>
                            <td className="py-3 pl-4 text-xs">
                              <div className="space-y-1">
                                {eh.reasons.length > 0 ? (
                                  <p className="text-ink">{eh.reasons.join(", ")}</p>
                                ) : (
                                  <span className="text-ink-muted">-</span>
                                )}
                                {eh.alerts.length > 0 ? (
                                  <p className="text-amber-600 text-[11px] font-medium">
                                    {eh.alerts.join(", ")}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted py-4 text-center">
                    Belum ada riwayat evaluasi untuk batch ini.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Riwayat Pembacaan Sensor */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm">Riwayat Pembacaan Telemetri Sensor</CardTitle>
                  <p className="text-xs text-ink-muted">
                    15 pembacaan kondisi terakhir dari perangkat pemantau / SIMULATOR
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {batch.recentReadings && batch.recentReadings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-ink">
                      <thead className="border-b border-border text-ink-muted">
                        <tr>
                          <th className="py-2.5 pr-4 font-normal">Waktu Pembacaan</th>
                          <th className="py-2.5 px-4 font-normal">Kesehatan Alat</th>
                          <th className="py-2.5 px-4 font-normal">Skenario</th>
                          <th className="py-2.5 pl-4 font-normal">Parameter Terukur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {batch.recentReadings.map((r) => (
                          <tr key={r.id} className="hover:bg-surface-muted/50">
                            <td className="py-3 pr-4 font-mono tnum text-ink-muted whitespace-nowrap">
                              {formatDateTime(r.readAt)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                                  r.deviceHealth === "ONLINE"
                                    ? "bg-compliant-soft text-compliant"
                                    : r.deviceHealth === "OFFLINE"
                                      ? "bg-danger-soft text-danger"
                                      : "bg-warning-soft text-warning"
                                }`}
                              >
                                <span className="size-1 rounded-full bg-current" />
                                {r.deviceHealth}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-ink-muted">
                              {r.scenario || "NORMAL"}
                            </td>
                            <td className="py-3 pl-4">
                              <div className="flex flex-wrap gap-2">
                                {r.values.map((v) => (
                                  <span
                                    key={v.code}
                                    className="inline-flex items-center gap-1 rounded bg-surface-muted px-2 py-0.5 text-[11px]"
                                  >
                                    <span className="text-ink-muted">
                                      {parameterLabel(v.code)}:
                                    </span>
                                    <span className="font-mono font-medium text-ink">
                                      {formatPPMDisplay(v.valuePPM)} {v.unit}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted py-4 text-center">
                    Belum ada pembacaan sensor tercatat untuk batch ini.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="serah-terima" className="mt-4">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Kronologi kustodi</CardTitle>
                </CardHeader>
                <CardContent>
                  <HandoffTimeline
                    custodyStage={batch.custodyStage}
                    events={batch.handoffs}
                    pendingToStage={batch.pendingIntent?.toStage ?? null}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Intent aktif</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {batch.pendingIntent ? (
                    <div className="space-y-2">
                      <Row label="Status">Menunggu penerimaan</Row>
                      <Row label="Menuju stage">
                        {batch.pendingIntent.toStage === 1 ? "Distributor" : "Retailer"}
                      </Row>
                      <Row label="Kedaluwarsa">{formatDateTime(batch.pendingIntent.expiresAt)}</Row>
                      <p className="text-xs text-ink-muted">
                        Kelola konfirmasi/pembatalan dari halaman Serah-terima.
                      </p>
                    </div>
                  ) : (
                    <p className="text-ink-muted">
                      Tidak ada serah-terima menunggu penerimaan. Kelola dari halaman{" "}
                      <Link
                        href="/mainapp/serah-terima"
                        className="font-medium text-brand underline-offset-2 hover:underline"
                      >
                        Serah-terima
                      </Link>
                      .
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Jejak audit on-chain</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SourceBadge />
                  <span className="text-xs text-ink-muted">
                    Status menunjukkan evaluasi atas data kondisi yang tercatat.
                  </span>
                </div>
                {batch.handoffs.length === 0 && !batch.chainTxHash ? (
                  <p className="text-sm text-ink-muted">
                    Belum ada peristiwa audit on-chain untuk batch ini. Peristiwa pendaftaran,
                    serah-terima, evaluasi kondisi, dan verifikasi akses sah akan tercatat di sini.
                  </p>
                ) : (
                  <ul className="divide-y divide-border text-sm">
                    <li className="flex items-center justify-between gap-3 py-2.5">
                      <span>Pendaftaran batch</span>
                      <span className="text-xs text-ink-muted">
                        {formatDateTime(batch.createdAt)}
                      </span>
                    </li>
                    {batch.handoffs.map((h, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                        <span>
                          Serah-terima {stageLabel(h.fromStage)} → {stageLabel(h.toStage)}
                        </span>
                        <span className="text-xs text-ink-muted">
                          {formatDateTime(h.confirmedAt)}
                        </span>
                      </li>
                    ))}
                    {batch.chainTxHash ? (
                      <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                        <span>Transaksi terakhir</span>
                        <TraceId value={batch.chainTxHash} label="Hash transaksi" />
                      </li>
                    ) : null}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </StaggerItem>
    </StaggerContainer>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-1.5 last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{children}</span>
    </div>
  );
}

function stageLabel(stage: number): string {
  return stage === 0 ? "Pabrik" : stage === 1 ? "Distributor" : "Retailer";
}
