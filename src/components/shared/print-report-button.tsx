"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReportButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="h-8 inline-flex items-center gap-1.5 rounded-lg border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs cursor-pointer print:hidden"
    >
      <Printer aria-hidden className="size-3.5 text-[#5D6679]" />
      <span>Cetak Dokumen Kepatuhan</span>
    </Button>
  );
}
