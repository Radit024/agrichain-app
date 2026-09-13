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
import { HandoffTimeline, formatDateTime } from "@/components/shared/handoff-timeline";
import { ComplianceCard } from "@/components/shared/compliance-card";
import { StatePanel } from "@/components/shared/state-panel";
import { QrDownloadButton } from "@/components/batch/qr-download-button";

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
    <div className="space-y-6">
      <Link
        href="/batch"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Kembali ke daftar batch
      </Link>

      {/* Header: identitas + QR + 3 status + update terakhir */}
      <header className="rounded-xl border border-border bg-card p-5">
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
      </header>

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
                  <Row label="Versi profil (snapshot)">{batch.profileSnapshot?.version ?? "–"}</Row>
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

        <TabsContent value="kondisi" className="mt-4">
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
                        batch.latestEvaluation.dataQualityStatus as "AVAILABLE" | "DATA_UNAVAILABLE"
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
                      href="/serah-terima"
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
    </div>
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
