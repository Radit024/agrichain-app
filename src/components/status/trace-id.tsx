"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TraceId — DESIGN.md §9.3: monospaced, truncated, tombol copy,
 * nilai penuh aksesibel (title + sr-only). Tidak pernah dipakai untuk
 * private key/token/kode otorisasi.
 */
export function TraceId({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

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
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        {copied ? (
          <Check aria-hidden className="size-3 text-compliant" />
        ) : (
          <Copy aria-hidden className="size-3" />
        )}
      </button>
    </span>
  );
}
