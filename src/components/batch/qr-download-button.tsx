"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="shrink-0 h-8 text-xs gap-1.5"
      >
        <Download aria-hidden className="size-3.5" />
        Unduh QR
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px]">
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
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button onClick={download} disabled={pending} className="text-xs h-9 gap-1.5">
              {pending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Download aria-hidden className="size-4" />
              )}
              Unduh Gambar QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Tombol Cetak Label Kemasan / Palet (Thermal / Stiker):
 * Menghasilkan pratinjau stiker kemasan 100mm x 75mm berstandar industri dengan QR
 * dan memicu pencetakan dokumen stiker.
 */
export function PrintPackagingLabelButton({
  publicId,
  batchCode,
  categoryName,
}: {
  publicId: string;
  batchCode: string;
  categoryName?: string;
}) {
  const [open, setOpen] = useState(false);

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Label Kemasan - ${batchCode}</title>
          <style>
            @page { size: 100mm 75mm; margin: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 10px;
              color: #111;
              box-sizing: border-box;
              width: 100mm;
              height: 75mm;
            }
            .label-border {
              border: 2px solid #000;
              padding: 8px 12px;
              height: calc(100% - 16px);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000;
              padding-bottom: 4px;
            }
            .brand { font-size: 11px; font-weight: 900; letter-spacing: 0.5px; }
            .badge { font-size: 8px; font-weight: 700; border: 1px solid #000; padding: 1px 4px; border-radius: 2px; }
            .body-grid {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              margin: 4px 0;
            }
            .info { flex: 1; }
            .batch-title { font-size: 8px; color: #555; text-transform: uppercase; font-weight: 600; }
            .batch-code { font-size: 16px; font-weight: 900; font-family: monospace; margin: 2px 0; }
            .category { font-size: 12px; font-weight: 700; color: #1570EF; margin-top: 2px; }
            .public-id { font-size: 8.5px; font-family: monospace; color: #444; margin-top: 4px; }
            .qr-img { width: 88px; height: 88px; object-fit: contain; }
            .footer {
              border-top: 1px dashed #666;
              padding-top: 4px;
              font-size: 8px;
              color: #333;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="label-border">
            <div class="header">
              <span class="brand">AGRICHAIN TRACEABILITY</span>
              <span class="badge">LABEL RESMI</span>
            </div>
            <div class="body-grid">
              <div class="info">
                <div class="batch-title">Nomor Batch Komoditas</div>
                <div class="batch-code">${batchCode}</div>
                <div class="category">${categoryName || "Komoditas Pangan Terdaftar"}</div>
                <div class="public-id">ID: ${publicId}</div>
              </div>
              <img src="/api/batch/${publicId}/qr" class="qr-img" alt="QR" />
            </div>
            <div class="footer">
              Pindai QR ini untuk verifikasi keaslian, kepatuhan suhu &amp; histori rantai pasok.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="shrink-0 h-8 text-xs gap-1.5 border-[#D0D5DD] hover:bg-gray-50 text-[#344054]"
      >
        <Printer aria-hidden className="size-3.5 text-[#5D6679]" />
        Cetak Label Kemasan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Pratinjau Label Kemasan / Palet</DialogTitle>
            <DialogDescription>
              Format stiker siap cetak untuk ditempelkan pada kemasan karton atau palet komoditas di
              pabrik.
            </DialogDescription>
          </DialogHeader>

          {/* Kartu Pratinjau Label Stiker */}
          <div className="rounded-xl border-2 border-dashed border-[#D0D5DD] bg-white p-4">
            <div className="rounded-lg border-2 border-black p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-bold text-xs tracking-wider text-black">
                  AGRICHAIN TRACEABILITY
                </span>
                <span className="rounded border border-black px-1.5 py-0.5 text-[9px] font-bold">
                  LABEL RESMI
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#858D9D]">
                    Nomor Batch Komoditas
                  </span>
                  <p className="font-mono text-base font-bold text-black">{batchCode}</p>
                  <p className="text-xs font-semibold text-[#1570EF]">
                    {categoryName || "Komoditas Pangan Terdaftar"}
                  </p>
                  <p className="font-mono text-[10px] text-[#5D6679]">ID: {publicId}</p>
                </div>

                <div className="size-20 shrink-0 border border-gray-200 p-1 rounded bg-white flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/batch/${publicId}/qr`}
                    alt={`QR ${batchCode}`}
                    className="size-full object-contain"
                  />
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 pt-2 text-center text-[10px] text-[#5D6679]">
                Pindai QR ini untuk verifikasi keaslian, kepatuhan suhu & histori rantai pasok.
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="text-xs h-9">
              Tutup
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-[#1570EF] hover:bg-[#004EEB] text-white text-xs h-9 gap-1.5"
            >
              <Printer className="size-4" />
              Cetak ke Printer / Thermal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
