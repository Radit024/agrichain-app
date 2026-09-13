import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * DataTable (DESIGN.md §9.3): header sticky, baris 56-64px, chip filter di
 * atas (disisipkan caller), row-click → detail. Mobile: caller menyediakan
 * versi kartu — tabel disembunyikan di bawah md.
 */

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  /** Konten sel; terima row penuh. */
  cell: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  mobileCards,
  emptyContent,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  mobileCards?: (row: T) => ReactNode;
  emptyContent?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && emptyContent) {
    return <>{emptyContent}</>;
  }

  return (
    <>
      {/* Tabel desktop */}
      <div
        className={cn(
          "hidden overflow-hidden rounded-xl border border-border bg-card md:block",
          className,
        )}
      >
        <div className="max-h-[560px] overflow-y-auto">
          <Table className="tnum">
            <TableHeader className="sticky top-0 z-10">
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={getRowKey(row, i)} className="h-14">
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Kartu mobile */}
      {mobileCards ? (
        <div className="flex flex-col gap-3 md:hidden">
          {rows.map((row, i) => (
            <div key={getRowKey(row, i)}>{mobileCards(row)}</div>
          ))}
        </div>
      ) : null}
    </>
  );
}
