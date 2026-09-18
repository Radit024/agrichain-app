import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Filter, Download } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listDistributionPoints, listBatches } from "@/server/queries/internal";
import { AddDistributionPointDialog } from "@/components/distribution/add-distribution-point-dialog";
import { DistributionPointsTable } from "@/components/distribution/distribution-points-table";
import { StaggerContainer, StaggerItem, MotionCard } from "@/components/motion/motion-container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Titik Distribusi" };
export const dynamic = "force-dynamic";

export default async function DistributionPointsPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();

  const [points, batches] = await Promise.all([
    listDistributionPoints(db, session),
    listBatches(db, session),
  ]);

  const activePointsCount = points.filter((p) => p.isActive).length;
  const scheduledPointsCount = points.filter((p) => p.schedules.length > 0).length;
  const totalActiveCodes = points.reduce((acc, p) => acc + (p.activeAccessCodesCount || 0), 0);
  const activeBatches = batches.map((b) => ({ id: b.id, batchCode: b.batchCode }));

  return (
    <StaggerContainer className="space-y-6 pb-12">
      {/* Summary Cards — Domain Ketertelusuran */}
      <StaggerItem>
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <h2 className="text-base font-semibold text-[#1D2939]">Ringkasan Titik Distribusi</h2>

          <div className="mt-4 grid grid-cols-1 divide-y divide-[#F0F1F3] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            <div className="py-2 sm:px-4 first:pl-0">
              <h3 className="text-sm font-semibold text-[#1570EF]">Total Titik</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">{points.length}</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Terdaftar di organisasi</p>
            </div>

            <div className="py-2 sm:px-4">
              <h3 className="text-sm font-semibold text-[#10B981]">Titik Aktif</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">{activePointsCount}</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Dapat digunakan verifikasi</p>
            </div>

            <div className="py-2 sm:px-4">
              <h3 className="text-sm font-semibold text-[#845EC2]">Terjadwal</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {scheduledPointsCount}
              </p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Memiliki batas jam operasional</p>
            </div>

            <div className="py-2 sm:px-4 last:pr-0">
              <h3 className="text-sm font-semibold text-[#F97316]">Kode Akses Aktif</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">{totalActiveCodes}</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Otorisasi berlaku</p>
            </div>
          </div>
        </MotionCard>
      </StaggerItem>

      {/* Table Card */}
      <StaggerItem>
        <MotionCard
          hoverLift={false}
          className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F1F3] pb-4">
            <h2 className="text-base font-semibold text-[#1D2939]">Daftar Titik Distribusi</h2>

            <div className="flex items-center gap-3">
              <AddDistributionPointDialog />

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 inline-flex items-center gap-1.5 rounded-lg border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs cursor-pointer"
              >
                <Filter className="size-3.5 text-[#5D6679]" />
                <span>Filters</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 inline-flex items-center gap-1.5 rounded-lg border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs cursor-pointer"
              >
                <Download className="size-3.5 text-[#5D6679]" />
                <span>Download all</span>
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <DistributionPointsTable points={points} batches={activeBatches} />

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#F0F1F3] pt-4 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs cursor-pointer"
            >
              Previous
            </Button>
            <span className="text-xs font-medium text-[#5D6679]">Page 1 of 1</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs cursor-pointer"
            >
              Next
            </Button>
          </div>
        </MotionCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
