"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Keyboard, Loader2, RefreshCw, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "motion/react";
import { ScanlineBeam } from "@/components/motion/motion-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccessResultBadge, accessHint } from "@/components/status/status-badges";

/**
 * Verifikasi akses (DESIGN.md): form satu-tujuan; konteks batch terkunci
 * di atas; hasil menggantikan form + retry/manual; tidak pernah expose
 * validitas kode. QR scan: html5-qrcode; fallback manual selalu tersedia.
 */

interface AssignedPoint {
  id: string;
  publicName: string;
  orgName: string;
}

type Phase = "input" | "result";
type ScanMode = "code" | "url";

export function AccessVerificationForm({
  points,
  initialPublicId,
}: {
  points: AssignedPoint[];
  initialPublicId?: string;
}) {
  const [phase, setPhase] = useState<Phase>(initialPublicId ? "input" : "input");
  const [publicId, setPublicId] = useState(initialPublicId ?? "");
  const [code, setCode] = useState("");
  const [pointId, setPointId] = useState(points[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    result: "SAH" | "TIDAK_SAH" | "ANOMALI";
    reason: string;
  } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => void; clear: () => void } | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(() => {
    try {
      scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch {
      /* scanner sudah berhenti */
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stopScanner(), [stopScanner]);

  function normalizeFromScan(text: string): string | null {
    const trimmed = text.trim();
    // URL /p/{publicId} → ekstrak segmen terakhir
    const urlMatch = /\/p\/([A-Z0-9-]{19})$/i.exec(trimmed);
    const raw = urlMatch ? urlMatch[1] : trimmed;
    const normalized = raw.toUpperCase().replace(/\s/g, "");
    return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized) ? normalized : null;
  }

  async function startScan() {
    setScanError(null);
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader-region", { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded) => {
          const pid = normalizeFromScan(decoded);
          if (pid) {
            stopScanner();
            setPublicId(pid);
          }
        },
        () => {
          /* frame tanpa QR — abaikan */
        },
      );
    } catch {
      stopScanner();
      setScanError("Kamera tidak dapat dibuka. Gunakan masukan ID manual di bawah.");
    }
  }

  async function submit() {
    if (!publicId || !code || !pointId) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/access/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicId, code, locationId: pointId }),
      });
      if (res.status === 401) {
        setError("Sesi berakhir. Masuk kembali untuk melanjutkan.");
        return;
      }
      const data = (await res.json()) as {
        result: "SAH" | "TIDAK_SAH" | "ANOMALI";
        reason: string;
      };
      setResult(data);
      setPhase("result");
      setCode("");
    } catch {
      setError("Verifikasi belum dapat diproses. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  const canSubmit = publicId.length === 19 && code.length >= 6 && !!pointId && !pending;

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {phase === "input" ? (
          <motion.section
            key="verify-input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div>
              <h2 className="text-base font-bold text-[#1D2939]">
                Validasi Hak Akses & Status Batch
              </h2>
              <p className="text-xs text-[#858D9D] mt-0.5">
                Pindai QR kode kemasan atau masukkan ID publik serta kode otorisasi untuk
                memvalidasi izin operasional.
              </p>
            </div>

            {/* Input / Scanner ID Publik */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="verify-public-id" className="text-xs font-semibold text-[#344054]">
                  ID Publik Batch <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant={scanning ? "destructive" : "outline"}
                  size="sm"
                  onClick={scanning ? stopScanner : () => void startScan()}
                  className="h-7 text-[11px] gap-1 px-2.5"
                >
                  {scanning ? (
                    <>
                      <X aria-hidden className="size-3" />
                      Tutup Kamera
                    </>
                  ) : (
                    <>
                      <Camera aria-hidden className="size-3 text-[#1570EF]" />
                      Pindai via Kamera
                    </>
                  )}
                </Button>
              </div>

              {scanning ? (
                <div className="rounded-xl border-2 border-[#1570EF]/30 bg-[#F9FAFB] p-3">
                  <p className="text-center text-xs text-[#5D6679] mb-2">
                    Arahkan kamera perangkat ke QR label kemasan batch...
                  </p>
                  <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-lg border-2 border-brand/50 bg-black/5">
                    <ScanlineBeam />
                    <div id="qr-reader-region" ref={scannerDivRef} className="size-full" />
                  </div>
                  {scanError ? (
                    <p role="alert" className="mt-2 text-center text-xs text-danger font-medium">
                      {scanError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="relative">
                <ScanLine aria-hidden className="absolute left-3 top-2.5 size-4 text-[#858D9D]" />
                <Input
                  id="verify-public-id"
                  value={publicId}
                  onChange={(e) => setPublicId(e.target.value.toUpperCase())}
                  placeholder="Contoh: 7F8A-9B2C-3D4E-5F6A"
                  className="pl-9 font-mono text-xs h-9.5"
                  maxLength={19}
                  aria-required
                />
              </div>
              <p className="text-[11px] text-[#858D9D]">
                Format: 4 kelompok karakter pemisah strip (XXXX-XXXX-XXXX-XXXX)
              </p>
            </div>

            {/* Input Kode Otorisasi */}
            <div className="space-y-1.5">
              <Label htmlFor="verify-code" className="text-xs font-semibold text-[#344054]">
                Kode Otorisasi Akses <span className="text-red-500">*</span>
              </Label>
              <Input
                id="verify-code"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Masukkan kode otorisasi dari admin/jadwal titik"
                autoComplete="off"
                className="text-xs h-9.5"
                aria-required
              />
              <p className="text-[11px] text-[#858D9D]">
                Kode diproses secara aman menggunakan hash Argon2id (tidak pernah disimpan mentah).
              </p>
            </div>

            {/* Pilihan Titik Distribusi */}
            <div className="space-y-1.5">
              <Label htmlFor="verify-point" className="text-xs font-semibold text-[#344054]">
                Titik Distribusi Operasional <span className="text-red-500">*</span>
              </Label>
              <Select value={pointId} onValueChange={(val) => setPointId(val ?? "")}>
                <SelectTrigger id="verify-point" className="w-full text-xs h-9.5">
                  <SelectValue placeholder="Pilih titik distribusi">
                    {points.find((p) => p.id === pointId)?.publicName ?? "Pilih titik distribusi"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {points.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.publicName} ({p.orgName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-danger-soft p-3 text-xs text-danger font-medium border border-danger/20"
              >
                {error}
              </p>
            ) : null}

            <Button
              className="w-full"
              size="lg"
              onClick={() => void submit()}
              disabled={!canSubmit}
            >
              {pending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <ShieldIconSmall />
              )}
              Verifikasi akses
            </Button>
          </motion.section>
        ) : (
          <motion.section
            key="verify-result"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="space-y-4 rounded-xl border border-border bg-card p-5"
            role="status"
            aria-label="Hasil verifikasi"
          >
            {result ? (
              <>
                <div className="flex flex-col items-center gap-2 pt-2 text-center">
                  <AccessResultBadge value={result.result} />
                  <p className="text-sm text-ink">{result.reason}</p>
                  <p className="text-xs text-ink-muted">{accessHint(result.result)}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setPhase("input")}>
                    <Keyboard aria-hidden className="size-4" />
                    Verifikasi batch lain
                  </Button>
                  <Button variant="ghost" onClick={() => void submit()} disabled={pending}>
                    <RefreshCw aria-hidden className="size-4" />
                    Coba lagi
                  </Button>
                </div>
              </>
            ) : null}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShieldIconSmall() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c7 0 13-2 13-2s6 2 13 2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
