"use client";

import { useState } from "react";
import { MapPin, KeyRound, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManagePointDialog } from "./manage-point-dialog";
import type { DistributionPointItem } from "@/server/queries/internal";

const weekdayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function weekdayLabel(weekday: number): string {
  return weekdayNames[weekday] ?? String(weekday);
}

interface BatchOption {
  id: string;
  batchCode: string;
}

interface DistributionPointsTableProps {
  points: DistributionPointItem[];
  batches: BatchOption[];
}

export function DistributionPointsTable({ points, batches }: DistributionPointsTableProps) {
  const [selectedPoint, setSelectedPoint] = useState<DistributionPointItem | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#F0F1F3] text-xs font-medium text-[#858D9D]">
            <tr>
              <th className="py-3.5 pr-4 font-normal">Nama Titik</th>
              <th className="py-3.5 px-4 font-normal">Organisasi</th>
              <th className="py-3.5 px-4 font-normal">Jadwal Operasional</th>
              <th className="py-3.5 px-4 font-normal">Petugas Ditugaskan</th>
              <th className="py-3.5 px-4 font-normal">Kode Akses</th>
              <th className="py-3.5 px-4 font-normal">Status</th>
              <th className="py-3.5 pl-4 text-right font-normal">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
            {points.length > 0 ? (
              points.map((p) => {
                const scheduleSummary =
                  p.schedules.length > 0
                    ? p.schedules
                        .map((s) => `${weekdayLabel(s.weekday)} ${s.start}-${s.end}`)
                        .join(", ")
                    : "Belum diatur";

                return (
                  <tr key={p.id} className="hover:bg-[#F9FAFB]">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2 font-medium text-sm text-[#1D2939]">
                        <MapPin className="size-4 text-[#1570EF] shrink-0" />
                        <span>{p.publicName}</span>
                      </div>
                      {p.internalNotes ? (
                        <span className="block text-xs text-[#858D9D] pl-6">{p.internalNotes}</span>
                      ) : null}
                    </td>
                    <td className="py-4 px-4 text-sm text-[#5D6679]">{p.orgName}</td>
                    <td className="py-4 px-4 text-xs text-[#5D6679]">
                      <span
                        className={`inline-block max-w-[200px] truncate ${
                          p.schedules.length === 0 ? "text-[#858D9D] italic" : ""
                        }`}
                        title={scheduleSummary}
                      >
                        {scheduleSummary}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#5D6679]">
                      {p.assignedUserNames.length > 0 ? (
                        <span className="font-medium text-[#1D2939]">
                          {p.assignedUserNames.join(", ")}
                        </span>
                      ) : (
                        <span className="text-[#858D9D] italic">Belum ada petugas</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs">
                      {p.activeAccessCodesCount > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#10B981]">
                          <KeyRound className="size-3" />
                          {p.activeAccessCodesCount} aktif
                        </span>
                      ) : (
                        <span className="text-[#858D9D]">0 aktif</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          p.isActive ? "bg-[#ECFDF3] text-[#027A48]" : "bg-[#FEF3F2] text-[#B42318]"
                        }`}
                      >
                        {p.isActive ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPoint(p)}
                        className="h-8 gap-1.5 rounded-lg border-[#D0D5DD] px-2.5 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs cursor-pointer"
                      >
                        <Settings className="size-3.5 text-[#5D6679]" />
                        Kelola
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-[#858D9D]">
                  Belum ada titik distribusi terdaftar. Klik{" "}
                  <span className="font-medium text-[#1570EF]">Tambah Titik</span> untuk membuat
                  lokasi baru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Singleton modal — only mounted when user actively clicks "Kelola" */}
      {selectedPoint ? (
        <ManagePointDialog
          point={selectedPoint}
          batches={batches}
          open={!!selectedPoint}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedPoint(null);
          }}
        />
      ) : null}
    </>
  );
}
