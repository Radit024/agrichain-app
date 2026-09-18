import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Filter, Download } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listBatches, listCategoryOptions } from "@/server/queries/internal";
import { RegisterBatchDialog } from "@/components/batch/register-batch-dialog";
import { formatDateTime } from "@/components/shared/handoff-timeline";
import {
  DistributionStatusBadge,
  ConditionStatusBadge,
  DataQualityStatusBadge,
} from "@/components/status/status-badges";
import { StaggerContainer, StaggerItem, MotionCard } from "@/components/motion/motion-container";

export const metadata: Metadata = { title: "Manajemen Batch" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BatchListPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const params = await searchParams;
  const db = await getDbAdapter();

  const get = (k: string) => {
    const v = params[k];
    return typeof v === "string" && v ? v : undefined;
  };

  const [batches, categories] = await Promise.all([
    listBatches(db, session, {
      mode: get("mode") as "COLD_CHAIN" | "NON_COLD_CHAIN" | undefined,
      distribution: get("distribution"),
      condition: get("condition"),
      dataQuality: get("dataQuality"),
      q: get("q"),
    }),
    listCategoryOptions(db, session),
  ]);

  const canRegister = session.memberships.some(
    (m) => m.role === "PRODUCER_ADMIN" || m.role === "FACTORY_STAFF",
  );

  return (
    <StaggerContainer className="space-y-6 pb-12">
      {/* Summary cards — domain ketertelusuran */}
      <StaggerItem>
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <h2 className="text-base font-semibold text-[#1D2939]">Ringkasan Batch</h2>
          <div className="mt-4 grid grid-cols-1 divide-y divide-[#F0F1F3] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            <div className="py-2 sm:px-4 first:pl-0">
              <h3 className="text-sm font-semibold text-[#1570EF]">Total Batch</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">{batches.length}</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Terdaftar</p>
            </div>
            <div className="py-2 sm:px-4">
              <h3 className="text-sm font-semibold text-[#10B981]">Compliant</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {batches.filter((b) => b.conditionStatus === "COMPLIANT").length}
              </p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Status kondisi</p>
            </div>
            <div className="py-2 sm:px-4">
              <h3 className="text-sm font-semibold text-[#EF4444]">AT Risk</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {batches.filter((b) => b.conditionStatus === "AT_RISK").length}
              </p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Perlu perhatian</p>
            </div>
            <div className="py-2 sm:px-4 last:pr-0">
              <h3 className="text-sm font-semibold text-[#F97316]">Dalam Distribusi</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {batches.filter((b) => b.distributionStatus === "DALAM_DISTRIBUSI").length}
              </p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Sedang berjalan</p>
            </div>
          </div>
        </MotionCard>
      </StaggerItem>

      {/* Table Card: Products (Persis 03-batch-register.png) */}
      <StaggerItem>
        <MotionCard
          hoverLift={false}
          className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        >
          {/* Table Header with Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F1F3] pb-4">
            <h2 className="text-base font-semibold text-[#1D2939]">Daftar Batch</h2>

            <div className="flex items-center gap-3">
              {canRegister ? (
                <RegisterBatchDialog
                  categories={categories}
                  custodianWallet={session.user.walletAddress}
                />
              ) : null}

              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] transition-all duration-150 active:scale-95 hover:border-[#B2B7C2] hover:bg-gray-50 shadow-2xs"
              >
                <Filter className="size-3.5 text-[#5D6679]" />
                <span>Filters</span>
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] transition-all duration-150 active:scale-95 hover:border-[#B2B7C2] hover:bg-gray-50 shadow-2xs"
              >
                <Download className="size-3.5 text-[#5D6679]" />
                <span>Download all</span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#F0F1F3] text-xs font-medium text-[#858D9D]">
                <tr>
                  <th className="py-3.5 pr-4 font-normal">Kode Batch</th>
                  <th className="py-3.5 px-4 font-normal">Kategori / Mode</th>
                  <th className="py-3.5 px-4 font-normal">Status Distribusi</th>
                  <th className="py-3.5 px-4 font-normal">Status Kondisi</th>
                  <th className="py-3.5 px-4 font-normal">Kualitas Data</th>
                  <th className="py-3.5 px-4 font-normal">Kustodi</th>
                  <th className="py-3.5 pl-4 font-normal">Didaftarkan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
                {batches.length > 0 ? (
                  batches.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F9FAFB] transition-colors duration-150">
                      <td className="py-4 pr-4">
                        <Link
                          href={`/mainapp/batch/${row.id}`}
                          className="font-mono font-medium hover:text-[#1570EF] transition-colors"
                        >
                          {row.batchCode}
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-[#1D2939]">{row.categoryName}</span>
                        <span className="block text-xs text-[#858D9D]">
                          {row.handlingMode === "COLD_CHAIN" ? "Cold chain" : "Non-cold chain"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <DistributionStatusBadge
                          value={
                            row.distributionStatus as "DIDAFTARKAN" | "DALAM_DISTRIBUSI" | "SELESAI"
                          }
                        />
                      </td>
                      <td className="py-4 px-4">
                        <ConditionStatusBadge
                          value={row.conditionStatus as "NOT_EVALUATED" | "COMPLIANT" | "AT_RISK"}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <DataQualityStatusBadge
                          value={row.dataQualityStatus as "AVAILABLE" | "DATA_UNAVAILABLE"}
                        />
                      </td>
                      <td className="py-4 px-4 text-sm text-[#5D6679]">
                        {row.custodyStage === 0
                          ? "Pabrik"
                          : row.custodyStage === 1
                            ? "Distributor"
                            : "Retailer"}
                      </td>
                      <td className="py-4 pl-4 text-xs text-[#5D6679] tnum">
                        {formatDateTime(row.lastUpdate)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-[#858D9D]">
                      Belum ada batch terdaftar. Klik{" "}
                      <span className="font-medium text-[#1570EF]">Daftarkan Batch</span> untuk
                      memulai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer: Pagination (Persis 03-batch-register.png) */}
          <div className="flex items-center justify-between border-t border-[#F0F1F3] pt-4 mt-2">
            <button
              type="button"
              className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] transition-all duration-150 active:scale-95 hover:border-[#B2B7C2] hover:bg-gray-50 shadow-2xs"
            >
              Previous
            </button>
            <span className="text-xs font-medium text-[#5D6679]">Page 1 of 10</span>
            <button
              type="button"
              className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] transition-all duration-150 active:scale-95 hover:border-[#B2B7C2] hover:bg-gray-50 shadow-2xs"
            >
              Next
            </button>
          </div>
        </MotionCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
