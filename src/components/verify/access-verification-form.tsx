"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Keyboard, Loader2, RefreshCw, ScanLine, X } from "lucide-react";
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
      {/* Konteks batch terkunci */}
      <section
        className="rounded-xl border border-border bg-surface-muted p-4"
        aria-label="Konteks batch"
      >
        <p className="text-xs font-medium text-ink-muted">Batch yang diverifikasi</p>
        {publicId ? (
          <p className="mt-1 font-mono text-sm font-semibold text-ink">{publicId}</p>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">
            Pindai QR batch atau masukkan ID publik untuk mengunci konteks.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={scanning ? "outline" : "secondary"}
            size="sm"
            onClick={scanning ? stopScanner : () => void startScan()}
          >
            {scanning ? (
              <>
                <X aria-hidden className="size-3.5" />
                Hentikan kamera
              </>
            ) : (
              <>
                <Camera aria-hidden className="size-3.5" />
                Pindai QR
              </>
            )}
          </Button>
          {publicId ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPublicId("")}>
              Ubah batch
            </Button>
          ) : null}
        </div>
      </section>

      {scanning ? (
        <section className="rounded-xl border border-border bg-card p-4" aria-label="Pemindai QR">
          <p className="text-xs leading-4 text-ink-muted">
            Arahkan kamera ke QR batch. Izin kamera diminta browser; identitas dan kode tidak pernah
            dikirim ke halaman publik.
          </p>
          <div
            id="qr-reader-region"
            ref={scannerDivRef}
            className="mx-auto mt-3 aspect-square w-full max-w-[280px] overflow-hidden rounded-lg border-2 border-brand/40 bg-ink/5"
          />
          {scanError ? (
            <p role="alert" className="mt-3 text-sm text-warning">
              {scanError}
            </p>
          ) : null}
        </section>
      ) : null}

      {phase === "input" ? (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="verify-public-id">ID publik batch</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine aria-hidden className="absolute left-2.5 top-2.5 size-4 text-ink-muted" />
                <Input
                  id="verify-public-id"
                  value={publicId}
                  onChange={(e) => setPublicId(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="pl-8 font-mono"
                  maxLength={19}
                  aria-required
                />
              </div>
            </div>
            <p className="text-xs text-ink-muted">
              Format: 4 kelompok huruf/angka yang dipisah strip.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="verify-code">Kode otorisasi</Label>
            <Input
              id="verify-code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Kode dari administrator"
              autoComplete="off"
              aria-required
            />
            <p className="text-xs text-ink-muted">
              Kode diproses sebagai hash — tidak pernah disimpan atau dicatat.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="verify-point">Titik verifikasi Anda</Label>
            <Select value={pointId} onValueChange={(v) => setPointId(v ?? "")}>
              <SelectTrigger id="verify-point" aria-required>
                <SelectValue
                  placeholder={points.length ? "Pilih titik" : "Belum ada penugasan titik"}
                />
              </SelectTrigger>
              <SelectContent>
                {points.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.publicName} — {p.orgName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs leading-4 text-danger"
            >
              <X aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
          ) : null}

          <Button className="w-full" size="lg" onClick={() => void submit()} disabled={!canSubmit}>
            {pending ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <ShieldIconSmall />
            )}
            Verifikasi akses
          </Button>
        </section>
      ) : (
        <section
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
        </section>
      )}
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
