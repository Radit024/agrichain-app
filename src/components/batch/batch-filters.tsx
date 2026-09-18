"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Filter strip di atas tabel batch (DESIGN.md): mode cold/non-cold,
 * distribusi, kondisi, kualitas data, pencarian. Persist via URL query.
 */

const distributionOptions = [
  { value: "DIDAFTARKAN", label: "Didaftarkan" },
  { value: "DALAM_DISTRIBUSI", label: "Dalam distribusi" },
  { value: "SELESAI", label: "Selesai" },
];
const conditionOptions = [
  { value: "NOT_EVALUATED", label: "Belum dievaluasi" },
  { value: "COMPLIANT", label: "Compliant" },
  { value: "AT_RISK", label: "At risk" },
];
const dataQualityOptions = [
  { value: "AVAILABLE", label: "Data tersedia" },
  { value: "DATA_UNAVAILABLE", label: "Data tidak tersedia" },
];

export function BatchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "ALL") next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const hasFilters =
    params.has("mode") ||
    params.has("distribution") ||
    params.has("condition") ||
    params.has("dataQuality") ||
    params.has("q");

  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-muted p-4"
      role="group"
      aria-label="Filter batch"
    >
      <div className="w-full sm:w-56">
        <Label htmlFor="filter-q" className="text-xs text-ink-muted">
          Cari
        </Label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value;
            setParam("q", value);
          }}
          className="mt-1"
        >
          <div className="relative">
            <Search aria-hidden className="absolute left-2.5 top-2.5 size-4 text-ink-muted" />
            <Input
              id="filter-q"
              name="q"
              defaultValue={params.get("q") ?? ""}
              placeholder="Kode batch / ID publik"
              className="h-9 bg-card pl-8"
            />
          </div>
        </form>
      </div>

      <FilterSelect
        id="filter-mode"
        label="Mode"
        value={params.get("mode") ?? "ALL"}
        onChange={(v) => setParam("mode", v)}
        options={[
          { value: "COLD_CHAIN", label: "Cold chain" },
          { value: "NON_COLD_CHAIN", label: "Non-cold chain" },
        ]}
      />
      <FilterSelect
        id="filter-distribution"
        label="Distribusi"
        value={params.get("distribution") ?? "ALL"}
        onChange={(v) => setParam("distribution", v)}
        options={distributionOptions}
      />
      <FilterSelect
        id="filter-condition"
        label="Kondisi"
        value={params.get("condition") ?? "ALL"}
        onChange={(v) => setParam("condition", v)}
        options={conditionOptions}
      />
      <FilterSelect
        id="filter-data"
        label="Kualitas data"
        value={params.get("dataQuality") ?? "ALL"}
        onChange={(v) => setParam("dataQuality", v)}
        options={dataQualityOptions}
      />

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-ink-muted hover:text-ink"
          onClick={() => router.push(pathname, { scroll: false })}
        >
          <X aria-hidden className="size-3.5" />
          Hapus filter
        </Button>
      ) : null}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="w-40">
      <Label htmlFor={id} className="text-xs text-ink-muted">
        {label}
      </Label>
      <Select value={value === "ALL" ? "ALL" : value} onValueChange={(v) => onChange(v ?? "ALL")}>
        <SelectTrigger id={id} className="mt-1 h-9 bg-card" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Semua</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Kartu batch mobile (DESIGN.md mobile layout). */
export function BatchMobileCard({
  batch,
}: {
  batch: {
    id: string;
    batchCode: string;
    categoryName: string;
    distributionStatus: string;
    conditionStatus: string;
    dataQualityStatus: string;
  };
}) {
  return (
    <Link
      href={`/mainapp/batch/${batch.id}`}
      className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-surface-muted"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-ink">{batch.batchCode}</p>
          <p className="truncate text-xs text-ink-muted">{batch.categoryName}</p>
        </div>
        <span className="text-xs text-ink-muted">Detail ›</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        <StatusPill status={batch.distributionStatus} />
        <StatusPill status={batch.conditionStatus} />
        <StatusPill status={batch.dataQualityStatus} />
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    DIDAFTARKAN: "bg-surface-muted text-ink-muted",
    DALAM_DISTRIBUSI: "bg-brand-soft text-brand",
    SELESAI: "bg-info-soft text-info",
    NOT_EVALUATED: "bg-surface-muted text-ink-muted",
    COMPLIANT: "bg-compliant-soft text-compliant",
    AT_RISK: "bg-warning-soft text-warning",
    AVAILABLE: "bg-surface-muted text-ink-muted",
    DATA_UNAVAILABLE: "bg-warning-soft text-warning",
  };
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] font-semibold leading-4",
        map[status] ?? "bg-surface-muted text-ink-muted",
      )}
    >
      {status === "DIDAFTARKAN"
        ? "Didaftarkan"
        : status === "DALAM_DISTRIBUSI"
          ? "Dalam distribusi"
          : status === "SELESAI"
            ? "Selesai"
            : status === "NOT_EVALUATED"
              ? "Belum dievaluasi"
              : status === "COMPLIANT"
                ? "Compliant"
                : status === "AT_RISK"
                  ? "At risk"
                  : status === "AVAILABLE"
                    ? "Data tersedia"
                    : "Data tidak tersedia"}
    </span>
  );
}
