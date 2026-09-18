import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldCheck, CheckCircle2, AlertTriangle, Link2, Activity, Layers } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { getReportMetrics } from "@/server/queries/internal";
import { formatDateTime } from "@/components/shared/handoff-timeline";
import { ConditionTrendChart } from "@/components/shared/trend-charts";
import { StaggerContainer, StaggerItem, MotionCard } from "@/components/motion/motion-container";

export const metadata: Metadata = { title: "Laporan Ketertelusuran" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();
  const m = await getReportMetrics(db, session);

  const totalVerifications = m.verificationOutcomes.reduce((acc, curr) => acc + curr.count, 0);
  const sahCount = m.verificationOutcomes.find((o) => o.outcome === "SAH")?.count ?? 0;
  const tidakSahCount = m.verificationOutcomes.find((o) => o.outcome === "TIDAK_SAH")?.count ?? 0;
  const anomaliCount = m.verificationOutcomes.find((o) => o.outcome === "ANOMALI")?.count ?? 0;

  return (
    <StaggerContainer className="space-y-6 pb-12">
      {/* Header Info */}
      <StaggerItem>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1D2939]">Laporan Ketertelusuran & Audit</h1>
            <p className="text-xs text-[#858D9D]">
              Rekapitulasi kepatuhan kondisi, verifikasi otorisasi akses, dan integritas ledger
              blockchain.
            </p>
          </div>
        </div>
      </StaggerItem>

      {/* Row 1: KPI Summary Cards */}
      <StaggerItem>
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <h2 className="text-base font-semibold text-[#1D2939]">Indikator Kinerja Kepatuhan</h2>

          <div className="mt-4 grid grid-cols-2 gap-4 divide-y divide-[#F0F1F3] sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
            <div className="py-2 sm:px-4 first:pl-0">
              <h3 className="text-sm font-semibold text-[#1570EF]">Batch Terpantau</h3>
              <p className="mt-2.5 font-bold text-xl text-[#1D2939] tnum">{m.monitoredBatches}</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Di bawah monitoring</p>
            </div>

            <div className="py-2 sm:px-4">
              <h3 className="text-sm font-semibold text-[#10B981]">Compliance Rate</h3>
              <p className="mt-2.5 font-bold text-xl text-[#10B981] tnum">{m.complianceRate}%</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Sesuai batas toleransi</p>
            </div>

            <div className="py-2 sm:px-4">
              <h3 className="text-sm font-semibold text-[#845EC2]">Total Verifikasi</h3>
              <p className="mt-2.5 font-bold text-xl text-[#1D2939] tnum">{totalVerifications}</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">14 hari terakhir</p>
            </div>

            <div className="py-2 sm:px-4 last:pr-0">
              <h3 className="text-sm font-semibold text-[#F97316]">Event Blockchain</h3>
              <p className="mt-2.5 font-bold text-xl text-[#1D2939] tnum">{m.evidence.length}</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Bukti audit immutable</p>
            </div>
          </div>
        </MotionCard>
      </StaggerItem>

      {/* Row 2: Distribusi Verifikasi (Kiri) + Kualitas Data (Kanan) */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Distribusi Verifikasi Akses */}
          <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:col-span-6">
            <h2 className="text-base font-semibold text-[#1D2939]">
              Hasil Verifikasi Akses Petugas
            </h2>
            <p className="text-xs text-[#858D9D] mt-0.5">
              Evaluasi tripartit: kode otorisasi, jadwal titik, dan status batch.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-[#F0FDF4] p-3 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#10B981]" />
                  <div>
                    <span className="font-semibold text-[#15803D]">SAH</span>
                    <p className="text-[11px] text-[#166534]">
                      Kode cocok, dalam jadwal, lokasi valid
                    </p>
                  </div>
                </div>
                <span className="font-bold text-sm text-[#15803D] tnum">{sahCount}</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#FFFBEB] p-3 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-[#D97706]" />
                  <div>
                    <span className="font-semibold text-[#B45309]">TIDAK SAH</span>
                    <p className="text-[11px] text-[#92400E]">
                      Kode salah atau otorisasi kedaluwarsa
                    </p>
                  </div>
                </div>
                <span className="font-bold text-sm text-[#B45309] tnum">{tidakSahCount}</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#FEF2F2] p-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#DC2626]" />
                  <div>
                    <span className="font-semibold text-[#B91C1C]">ANOMALI</span>
                    <p className="text-[11px] text-[#991B1B]">
                      Di luar jadwal atau lokasi tidak sesuai
                    </p>
                  </div>
                </div>
                <span className="font-bold text-sm text-[#B91C1C] tnum">{anomaliCount}</span>
              </div>
            </div>
          </MotionCard>

          {/* Karakteristik Integritas & Kepatuhan */}
          <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:col-span-6 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1D2939]">Jaminan Integritas Sistem</h2>
              <p className="text-xs text-[#858D9D] mt-0.5">
                Standar arsitektur ketertelusuran yang diterapkan pada sistem ini.
              </p>

              <div className="mt-4 space-y-2.5 text-xs text-[#344054]">
                <div className="flex items-start gap-2.5 rounded-lg border border-[#F0F1F3] p-2.5">
                  <Layers className="size-4 text-[#1570EF] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#1D2939]">Separasi Dua Dimensi</span>
                    <p className="text-[#5D6679]">
                      Status kondisi (<code className="text-[#1570EF]">COMPLIANT / AT_RISK</code>)
                      dipisahkan tegas dari kualitas data sensor (
                      <code className="text-[#1570EF]">AVAILABLE / DATA_UNAVAILABLE</code>).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg border border-[#F0F1F3] p-2.5">
                  <Link2 className="size-4 text-[#10B981] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#1D2939]">
                      Rekonsiliasi Submitter On-Chain
                    </span>
                    <p className="text-[#5D6679]">
                      Event kritis antrean off-chain diverifikasi dan dicatat ke smart contract
                      AgrichainLedger dengan jaminan idempotensi.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg border border-[#F0F1F3] p-2.5">
                  <Activity className="size-4 text-[#845EC2] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#1D2939]">Anti-Enumeration Guard</span>
                    <p className="text-[#5D6679]">
                      Verifikasi kode otorisasi di-hash dengan Argon2id; respon gagal diseragamkan
                      untuk memitigasi serangan enumeration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </MotionCard>
        </div>
      </StaggerItem>

      {/* Row 3: Tren Kepatuhan Kondisi Harian */}
      <StaggerItem>
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1D2939]">
                Tren Kepatuhan Kondisi Batch (14 Hari)
              </h2>
              <p className="text-xs text-[#858D9D]">
                Fluktuasi batch dalam batas toleransi (
                <span className="text-[#10B981]">Compliant</span>) versus di luar batas (
                <span className="text-[#F43F5E]">AT_RISK</span>). Sumber: SIMULATOR.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#5D6679]">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#10B981]" /> Compliant
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#F43F5E]" /> AT Risk
              </span>
            </div>
          </div>

          <div className="mt-4">
            <ConditionTrendChart data={m.trend} height={260} />
          </div>
        </MotionCard>
      </StaggerItem>

      {/* Row 4: Log Bukti Transaksi Blockchain */}
      <StaggerItem>
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#1D2939]">
                Bukti Transaksi Blockchain (Ledger Evidence)
              </h2>
              <p className="text-xs text-[#858D9D]">
                Daftar referensi transaksi terdesentralisasi yang mencatat integritas data batch dan
                peristiwa penting.
              </p>
            </div>
            <span className="rounded-full bg-[#EFF8FF] px-2.5 py-0.5 text-xs font-semibold text-[#1570EF]">
              {m.evidence.length} Record
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#F0F1F3] text-xs font-medium text-[#858D9D]">
                <tr>
                  <th className="py-3 pr-4 font-normal">Batch</th>
                  <th className="py-3 px-4 font-normal">Tipe Peristiwa</th>
                  <th className="py-3 px-4 font-normal">Waktu Terjadi</th>
                  <th className="py-3 px-4 font-normal">Status Sinkronisasi</th>
                  <th className="py-3 pl-4 text-right font-normal">Tx Hash (Blockchain)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
                {m.evidence.length > 0 ? (
                  m.evidence.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#F9FAFB] transition-colors duration-150">
                      <td className="py-3.5 pr-4 font-mono font-medium text-xs">
                        {ev.batchCode || "–"}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-[#344054]">{ev.eventType}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#5D6679] tnum">
                        {formatDateTime(ev.eventTime)}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            ev.syncStatus === "SYNCED"
                              ? "bg-[#ECFDF3] text-[#027A48]"
                              : ev.syncStatus === "PENDING"
                                ? "bg-[#EFF8FF] text-[#175CD3]"
                                : "bg-[#FEF3F2] text-[#B42318]"
                          }`}
                        >
                          {ev.syncStatus}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-right font-mono text-xs text-[#5D6679]">
                        {ev.txHash ? (
                          <span className="text-[#1570EF]" title={ev.txHash}>
                            {ev.txHash.slice(0, 10)}...{ev.txHash.slice(-8)}
                          </span>
                        ) : (
                          <span className="text-[#858D9D] italic">Antrean Submitter</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#858D9D]">
                      Belum ada transaksi blockchain yang tercatat untuk organisasi ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </MotionCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
