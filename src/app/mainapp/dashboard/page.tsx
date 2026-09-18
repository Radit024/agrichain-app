import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Boxes,
  MapPin,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  Activity,
  ArrowRight,
} from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDashboardMetrics } from "@/server/queries/internal";
import { getDbAdapter } from "@/server/db/adapter";
import { ConditionBarChart, HandoffTrendChart } from "@/components/shared/trend-charts";
import { DistributionStatusBadge, ConditionStatusBadge } from "@/components/status/status-badges";
import { formatDateTime } from "@/components/shared/handoff-timeline";
import { StaggerContainer, StaggerItem, MotionCard } from "@/components/motion/motion-container";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();

  const m = await getDashboardMetrics(db, session);

  const activePointsCount = m.activePointsCount;
  const totalAccess = m.sahAttempts + m.tidakSahAttempts + m.anomaliAttempts;

  return (
    <StaggerContainer className="space-y-6 pb-12">
      {/* Row 1: Ringkasan Distribusi (Kiri) + Status Kondisi Batch (Kanan) */}
      <StaggerItem className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Distribusi & Kustodi Overview */}
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1D2939]">Distribusi & Kustodi</h2>
            <Link
              href="/mainapp/batch"
              className="group inline-flex items-center gap-1 text-xs font-semibold text-[#1570EF] hover:underline"
            >
              Lihat Batch{" "}
              <ArrowRight className="size-3 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Batch Aktif */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#1570EF]">
                <Boxes className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">{m.activeBatches}</span>
                <span className="text-xs text-[#858D9D]">Batch Aktif</span>
              </div>
            </div>

            {/* Dalam Distribusi */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#EFF8FF] text-[#1570EF]">
                <TrendingUp className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">{m.inDistribution}</span>
                <span className="text-xs text-[#858D9D]">Di Perjalanan</span>
              </div>
            </div>

            {/* Menunggu Penerimaan */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#FFEDD5] text-[#F97316]">
                <Clock className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">
                  {m.awaitingReception}
                </span>
                <span className="text-xs text-[#858D9D]">Menunggu Handoff</span>
              </div>
            </div>

            {/* Didaftarkan Hari Ini */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#10B981]">
                <Calendar className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">{m.registeredToday}</span>
                <span className="text-xs text-[#858D9D]">Didaftarkan Hari Ini</span>
              </div>
            </div>
          </div>
        </MotionCard>

        {/* Status Kepatuhan Batch */}
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:col-span-4">
          <h2 className="text-base font-semibold text-[#1D2939]">Kepatuhan Kondisi</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {/* Compliant */}
            <div className="flex flex-col items-center text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#10B981]">
                <CheckCircle2 className="size-4.5" />
              </div>
              <span className="mt-2.5 font-bold text-base text-[#10B981] tnum">{m.compliant}</span>
              <span className="mt-0.5 text-xs text-[#858D9D]">Compliant</span>
            </div>

            {/* AT_RISK */}
            <div className="flex flex-col items-center text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#FEE2E2] text-[#EF4444]">
                <AlertTriangle className="size-4.5" />
              </div>
              <span className="mt-2.5 font-bold text-base text-[#EF4444] tnum">{m.atRisk}</span>
              <span className="mt-0.5 text-xs text-[#858D9D]">AT Risk</span>
            </div>
          </div>
        </MotionCard>
      </StaggerItem>

      {/* Row 2: Verifikasi Akses Petugas (Kiri) + Titik Distribusi (Kanan) */}
      <StaggerItem className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Verifikasi Akses Overview */}
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1D2939]">
              Verifikasi Akses Petugas (7 Hari Terakhir)
            </h2>
            <Link
              href="/mainapp/verifikasi"
              className="group inline-flex items-center gap-1 text-xs font-semibold text-[#1570EF] hover:underline"
            >
              Verifikasi Baru{" "}
              <ArrowRight className="size-3 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Total Attempt */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#1570EF]">
                <Activity className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">{totalAccess}</span>
                <span className="text-xs text-[#858D9D]">Total Verifikasi</span>
              </div>
            </div>

            {/* SAH */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#10B981]">
                <ShieldCheck className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#10B981] tnum">{m.sahAttempts}</span>
                <span className="text-xs text-[#858D9D]">SAH</span>
              </div>
            </div>

            {/* TIDAK SAH */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#FFEDD5] text-[#F97316]">
                <XCircle className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#F97316] tnum">
                  {m.tidakSahAttempts}
                </span>
                <span className="text-xs text-[#858D9D]">TIDAK SAH</span>
              </div>
            </div>

            {/* ANOMALI */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#FEE2E2] text-[#EF4444]">
                <AlertTriangle className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#EF4444] tnum">{m.anomaliAttempts}</span>
                <span className="text-xs text-[#858D9D]">ANOMALI</span>
              </div>
            </div>
          </div>
        </MotionCard>

        {/* Infrastruktur Titik Distribusi */}
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1D2939]">Titik Distribusi</h2>
            <Link
              href="/mainapp/titik-distribusi"
              className="group inline-flex items-center gap-1 text-xs font-semibold text-[#1570EF] hover:underline"
            >
              Kelola{" "}
              <ArrowRight className="size-3 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            {/* Active Points */}
            <div className="flex flex-col items-center text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#1570EF]">
                <MapPin className="size-4.5" />
              </div>
              <span className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {activePointsCount}
              </span>
              <span className="mt-0.5 text-xs text-[#858D9D]">Titik Aktif</span>
            </div>

            {/* Total Points */}
            <div className="flex flex-col items-center text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#F3E8FF] text-[#845EC2]">
                <Users className="size-4.5" />
              </div>
              <span className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {m.totalPointsCount}
              </span>
              <span className="mt-0.5 text-xs text-[#858D9D]">Total Terdaftar</span>
            </div>
          </div>
        </MotionCard>
      </StaggerItem>

      {/* Row 3: Tren Kepatuhan Kondisi (Kiri) + Tren Serah-terima Kustodi (Kanan) */}
      <StaggerItem className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Tren Kepatuhan Kondisi Harian */}
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1D2939]">
                Tren Evaluasi Kondisi (14 Hari)
              </h2>
              <p className="text-xs text-[#858D9D]">
                Data kondisi hasil pembacaan berkala (Sumber: SIMULATOR).
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#5D6679]">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#10B981]" /> Sesuai Batas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#F43F5E]" /> Di Luar Batas
              </span>
            </div>
          </div>
          <div className="mt-4">
            <ConditionBarChart data={m.conditionTrend} height={260} />
          </div>
        </MotionCard>

        {/* Tren Serah-terima Kustodi */}
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:col-span-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1D2939]">Tren Serah-terima (14 Hari)</h2>
            <p className="text-xs text-[#858D9D]">Peristiwa transisi perpindahan stage kustodi.</p>
            <div className="mt-4">
              <HandoffTrendChart data={m.handoffTrend} height={210} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-5 text-xs text-[#5D6679] border-t border-[#F0F1F3] pt-3">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#1570EF]" /> Inisiasi (Pending)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#10B981]" /> Dikonfirmasi
            </span>
          </div>
        </MotionCard>
      </StaggerItem>

      {/* Row 4: Batch Perlu Perhatian (Kiri) + Peringatan Kondisi Terkini (Kanan) */}
      <StaggerItem className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Batch Perlu Perhatian */}
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:col-span-8">
          <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#1D2939]">Batch Perlu Perhatian</h2>
              <p className="text-xs text-[#858D9D]">
                Batch dengan status AT_RISK, data tidak tersedia, atau serah-terima menunggu.
              </p>
            </div>
            <Link
              href="/mainapp/batch"
              className="text-xs font-semibold text-[#1570EF] hover:underline"
            >
              Semua Batch
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#F0F1F3] text-xs font-medium text-[#858D9D]">
                <tr>
                  <th className="py-3 pr-4 font-normal">Kode Batch</th>
                  <th className="py-3 px-4 font-normal">Komoditas</th>
                  <th className="py-3 px-4 font-normal">Distribusi</th>
                  <th className="py-3 px-4 font-normal">Kondisi</th>
                  <th className="py-3 pl-4 text-right font-normal">Diperbarui</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
                {m.attentionBatches.length > 0 ? (
                  m.attentionBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F9FAFB] transition-colors duration-150">
                      <td className="py-3.5 pr-4 font-mono font-medium">
                        <Link href={`/mainapp/batch/${b.id}`} className="hover:text-[#1570EF]">
                          {b.batchCode}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-[#5D6679] text-xs">{b.productName || "–"}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <DistributionStatusBadge
                          value={
                            b.distributionStatus as "DIDAFTARKAN" | "DALAM_DISTRIBUSI" | "SELESAI"
                          }
                        />
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <ConditionStatusBadge
                          value={b.conditionStatus as "NOT_EVALUATED" | "COMPLIANT" | "AT_RISK"}
                        />
                      </td>
                      <td className="py-3.5 pl-4 text-right text-xs text-[#858D9D] tnum">
                        {formatDateTime(b.updatedAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#858D9D]">
                      Tidak ada batch yang memerlukan perhatian segera saat ini. Seluruh kondisi
                      terpantau normal.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </MotionCard>

        {/* Peringatan Kondisi Terkini */}
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-4">
              <h2 className="text-base font-semibold text-[#1D2939]">Peringatan Kondisi</h2>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                {m.conditionAlerts.length} Terdeteksi
              </span>
            </div>

            {m.conditionAlerts.length > 0 ? (
              <ul className="divide-y divide-[#F0F1F3] mt-1">
                {m.conditionAlerts.map((a) => (
                  <li key={a.id} className="py-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-[#1D2939]">
                            {a.batchCode}
                          </span>
                          <span className="text-[11px] text-[#858D9D]">
                            {formatDateTime(a.createdAt).split(",")[0]}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#5D6679] line-clamp-2">
                          {a.reason.replace(/["\[\]]/g, "")}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-12 text-center text-xs text-[#858D9D]">
                <CheckCircle2 className="size-8 text-[#10B981] mx-auto mb-2 opacity-80" />
                Tidak ada anomali atau pelanggaran parameter kondisi yang tercatat.
              </div>
            )}
          </div>
        </MotionCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
