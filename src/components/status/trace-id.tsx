"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TraceId — DESIGN.md §9.3: monospaced, truncated, tombol copy,
 * nilai penuh aksesibel (title + sr-only). Dilengkapi link ke scanner
 * blockchain (Polygonscan) bila berupa hash transaksi.
 */
export function TraceId({
  value,
  label,
  className,
  isTx,
  explorerUrl,
}: {
  value: string;
  label?: string;
  className?: string;
  isTx?: boolean;
  explorerUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  const isTransaction =
    isTx || (typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value.trim()));
  const scanUrl =
    explorerUrl ?? (isTransaction ? `https://amoy.polygonscan.com/tx/${value.trim()}` : null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className={cn("inline-flex max-w-full items-center gap-1", className)}>
      <code
        title={value}
        className="truncate font-mono text-xs text-ink"
        aria-label={`${label ?? "ID"}: ${value}`}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Tersalin" : `Salin ${label ?? "ID"}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-ink-muted transition-all duration-150 active:scale-90 hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring cursor-pointer"
      >
        {copied ? (
          <Check aria-hidden className="size-3 text-compliant animate-in zoom-in-50 duration-150" />
        ) : (
          <Copy aria-hidden className="size-3 transition-transform duration-150 hover:scale-110" />
        )}
      </button>
      {scanUrl ? (
        <a
          href={scanUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Buka di Polygonscan Blockchain Scanner"
          aria-label={`Buka ${label ?? "transaksi"} di Polygonscan`}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-ink-muted transition-all duration-150 hover:bg-surface-muted hover:text-[#1570EF] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          <ExternalLink aria-hidden className="size-3" />
        </a>
      ) : null}
    </span>
  );
}
