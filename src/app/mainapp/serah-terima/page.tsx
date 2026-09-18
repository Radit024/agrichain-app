import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Filter, History } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listHandoffs, listHandoffableBatches } from "@/server/queries/internal";
import { InitiateHandoffDialog } from "@/components/handoff/handoff-dialogs";
import { formatDateTime } from "@/components/shared/handoff-timeline";
import {
  HandoffIntentBadge,
  type HandoffIntentBadgeValue,
} from "@/components/status/status-badges";
import { StaggerContainer, StaggerItem, MotionCard } from "@/components/motion/motion-container";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Serah-terima" };
export const dynamic = "force-dynamic";

export default async function HandoffPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();

  const [intents, handoffable] = await Promise.all([
    listHandoffs(db, session),
    listHandoffableBatches(db, session),
  ]);

  return (
    <StaggerContainer className="space-y-6 pb-12">
      <StaggerItem>
        <MotionCard className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <h2 className="text-base font-semibold text-[#1D2939]">Ringkasan Serah-terima</h2>
          <div className="mt-4 grid grid-cols-1 divide-y divide-[#F0F1F3] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            <div className="py-2 sm:px-4 first:pl-0">
              <h3 className="text-sm font-semibold text-[#1570EF]">Total Intent</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">{intents.length}</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Semua status</p>
            </div>
            <div className="py-2 sm:px-4">
              <h3 className="text-sm font-semibold text-[#F97316]">Menunggu</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {intents.filter((i) => i.status === "PENDING").length}
              </p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Belum dikonfirmasi</p>
            </div>
            <div className="py-2 sm:px-4">
              <h3 className="text-sm font-semibold text-[#10B981]">Dikonfirmasi</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {intents.filter((i) => i.status === "CONFIRMED").length}
              </p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Selesai</p>
            </div>
            <div className="py-2 sm:px-4 last:pr-0">
              <h3 className="text-sm font-semibold text-[#EF4444]">Dibatalkan</h3>
              <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {intents.filter((i) => i.status === "CANCELLED" || i.status === "EXPIRED").length}
              </p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Batal/kedaluwarsa</p>
            </div>
          </div>
        </MotionCard>
      </StaggerItem>

      {/* Table Card: Orders (Persis 07-handoffs.png) */}
      <StaggerItem>
        <MotionCard
          hoverLift={false}
          className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        >
          {/* Table Header with Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F1F3] pb-4">
            <h2 className="text-base font-semibold text-[#1D2939]">Daftar Serah-terima</h2>

            <div className="flex items-center gap-3">
              <InitiateHandoffDialog batches={handoffable} />

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
                <History className="size-3.5 text-[#5D6679]" />
                <span>Riwayat Serah-terima</span>
              </Button>
            </div>
          </div>

          {/* Tabel Serah-terima */}
          <Table>
            <TableHeader className="border-b border-[#F0F1F3]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3.5 pr-4 font-normal text-xs text-[#858D9D]">
                  Batch
                </TableHead>
                <TableHead className="py-3.5 px-4 font-normal text-xs text-[#858D9D]">
                  Asal → Tujuan
                </TableHead>
                <TableHead className="py-3.5 px-4 font-normal text-xs text-[#858D9D]">
                  Stage
                </TableHead>
                <TableHead className="py-3.5 px-4 font-normal text-xs text-[#858D9D]">
                  Status
                </TableHead>
                <TableHead className="py-3.5 px-4 font-normal text-xs text-[#858D9D]">
                  Kedaluwarsa
                </TableHead>
                <TableHead className="py-3.5 pl-4 font-normal text-xs text-[#858D9D]">
                  Dibuat
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
              {intents.length > 0 ? (
                intents.map((r) => {
                  const stageLabel = (from: number, to: number) =>
                    `${from === 0 ? "Pabrik" : from === 1 ? "Distributor" : "Retailer"} → ${
                      to === 1 ? "Distributor" : "Retailer"
                    }`;
                  return (
                    <TableRow
                      key={r.intentId}
                      className="hover:bg-[#F9FAFB] transition-colors duration-150"
                    >
                      <TableCell className="py-4 pr-4 font-mono font-medium">
                        <Link href={`/mainapp/batch/${r.batchId}`} className="hover:text-[#1570EF]">
                          {r.batchCode}
                        </Link>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-sm text-[#5D6679]">
                        {r.senderOrgName}
                        <span className="mx-1 text-[#D0D5DD]">→</span>
                        {r.recipientOrgName}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-xs text-[#5D6679]">
                        {stageLabel(r.fromStage, r.toStage)}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-xs">
                        <HandoffIntentBadge value={r.status as HandoffIntentBadgeValue} />
                      </TableCell>
                      <TableCell className="py-4 px-4 text-xs text-[#5D6679] tnum">
                        {formatDateTime(r.expiresAt)}
                      </TableCell>
                      <TableCell className="py-4 pl-4 text-xs text-[#5D6679] tnum">
                        {formatDateTime(r.initiatedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-[#858D9D]">
                    Belum ada serah-terima tercatat. Klik{" "}
                    <span className="font-medium text-[#1570EF]">Mulai Serah-terima</span> untuk
                    memulai.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Footer: Pagination (Persis 07-handoffs.png) */}
          <div className="flex items-center justify-between border-t border-[#F0F1F3] pt-4 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs cursor-pointer"
            >
              Previous
            </Button>
            <span className="text-xs font-medium text-[#5D6679]">Page 1 of 10</span>
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
