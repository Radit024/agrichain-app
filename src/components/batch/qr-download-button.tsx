"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Unduh QR (DESIGN.md §9.5): modal konfirmasi → server route menghasilkan
 * PNG URL {APP_URL}/p/{publicId} saja (K9 — tanpa kode/data kondisi).
 */
export function QrDownloadButton({ publicId, batchCode }: { publicId: string; batchCode: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/batch/${publicId}/qr`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${batchCode}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      setError("QR belum dapat dibuat. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="shrink-0">
        <Download aria-hidden className="size-4" />
        Unduh QR
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Unduh QR batch</DialogTitle>
            <DialogDescription>
              QR hanya memuat tautan publik ke halaman batch — tanpa kode otorisasi, data kondisi,
              atau identitas petugas.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-lg bg-surface-muted px-3 py-2.5 font-mono text-xs text-ink">
            {publicId}
          </p>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={download} disabled={pending}>
              {pending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Download aria-hidden className="size-4" />
              )}
              Unduh QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
